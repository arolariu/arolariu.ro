BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Ensure-KeyVaultSecret.ps1'
}

Describe 'Ensure-KeyVaultSecret owned access' {
    BeforeEach {
        $fixture = New-TaskFixture
        $fixture.SecretReadStatus = 403
        $receiptPath = Join-Path $TestDrive "$([guid]::NewGuid()).json"
        $fixture.ExpectedReceiptPath = $receiptPath
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.VaultId
            SecretName = 'api-jwt'; SecretValue = (ConvertTo-SecureString 'test-only-private' -AsPlainText -Force)
            ManageTemporaryAccess = $true; RecoveryReceiptPath = $receiptPath; NonInteractive = $true; Confirm = $false
        }
    }

    It 'CreatesOwnedLeaseAndCleansItAfterSuccess' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output.Count | Should -Be 1
        $result.Output[0].Status | Should -Be 'Changed'
        $result.Output[0].AccessChanged | Should -BeTrue
        $result.Output[0].CleanupStatus | Should -Be 'Completed'
        $fixture.RoleAssignments.Count | Should -Be 0
        ($fixture.AccessMutations.Name -join ',') | Should -Be 'Grant,Revoke'
        $fixture.Mutations.Count | Should -Be 1
        (Get-Content -LiteralPath $receiptPath -Raw) | Should -Not -Match 'test-only-private'
    }

    It 'ReportsAnUnchangedBusinessTargetSeparatelyFromTemporaryAccess' {
        $fixture.SecretVersions = @(New-SecretMetadata)
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'NoChange'
        $result.Output[0].Changed | Should -BeFalse
        $result.Output[0].AccessChanged | Should -BeTrue
        $fixture.Mutations.Count | Should -Be 0
        $fixture.RoleAssignments.Count | Should -Be 0
    }

    It 'CleansOwnedLeaseAfterOperationFailure' {
        $fixture.SecretWriteStatus = 500
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SecretWriteFailed'
        $result.Output.Count | Should -Be 0
        $fixture.RoleAssignments.Count | Should -Be 0
        (Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json).Cleanup.Status | Should -Be 'Completed'
    }

    It 'PreservesExistingGrantsWithoutCreatingOrRemovingThem' {
        $fixture.RoleAssignments.Add([pscustomobject]@{
            RoleAssignmentId = "$($fixture.VaultId)/providers/Microsoft.Authorization/roleAssignments/66666666-6666-4666-8666-666666666666"
            ObjectId = $fixture.PrincipalId; Scope = $fixture.VaultId
            RoleDefinitionId = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'; Description = 'pre-existing'; Condition = ''
        })
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.RoleAssignments.Count | Should -Be 1
        $fixture.RoleAssignments[0].Description | Should -Be 'pre-existing'
        $fixture.AccessMutations.Count | Should -Be 0
        $result.Output[0].AccessChanged | Should -BeFalse
    }

    It 'PreservesConcurrentGrants' {
        $fixture.AddConcurrentRoleOnSecretWrite = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.RoleAssignments.Count | Should -Be 1
        $fixture.RoleAssignments[0].Description | Should -Be 'concurrent'
    }

    It 'ReusesExistingKeyVaultAdministratorAccess' {
        $fixture.SecretReadStatus = 0
        $fixture.RoleAssignments.Add([pscustomobject]@{
            RoleAssignmentId = "$($fixture.VaultId)/providers/Microsoft.Authorization/roleAssignments/66666666-6666-4666-8666-666666666666"
            ObjectId = $fixture.PrincipalId; Scope = $fixture.VaultId
            RoleDefinitionId = '00482a5a-887f-4fb3-b363-3b7fe8e74483'; Description = 'pre-existing administrator'; Condition = ''
        })
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.RoleAssignments.Count | Should -Be 1
    }

    It 'UsesServicePrincipalTypeForV1ApplicationTokenMetadata' {
        $fixture.ActorKind = 'Application'
        $fixture.Context.Account.Type = 'ServicePrincipal'
        $fixture.OmitIdentityType = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.RoleAssignments.Count | Should -Be 0
    }

    It 'DoesNotLogUnvalidatedClientClaimText' {
        $fixture.ClientId = 'SENSITIVE-PROVIDER-BODY'
        $fixture.SecretReadStatus = 0
        $fixture.SecretVersions = @(New-SecretMetadata)
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
        $fixture.AccessMutations.Count | Should -Be 0
    }

    It 'ReceiptIsPersistedBeforeAccessMutation' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.ReceiptPhasesAtGrant.Count | Should -Be 1
        $fixture.ReceiptPhasesAtGrant[0] | Should -Be 'Prepared'
    }

    It 'UnusableReceiptPathPreventsEveryMutation' {
        $parameters.RecoveryReceiptPath = $TestDrive
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ReceiptInvalid:'
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'CleanupFailureDoesNotReturnSuccess' {
        $fixture.RoleCleanupStatus = 500
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'CleanupFailed'
        $result.Output.Count | Should -Be 0
        $fixture.RoleAssignments.Count | Should -Be 1
        $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
        $receipt.Cleanup.Status | Should -Be 'Failed'
        $receipt.OwnedRoleAssignments[0].Id | Should -Be $fixture.RoleAssignments[0].RoleAssignmentId
    }

    It 'PartiallyFailedRoleCreationIsStillCleanedUp' {
        $fixture.FailAfterRoleGrant = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'AccessSetupFailed'
        $fixture.RoleAssignments.Count | Should -Be 0
        ($fixture.AccessMutations.Name -join ',') | Should -Be 'Grant,Revoke'
    }

    It 'WhatIfLeavesUnknownProtectedStateWithoutGrants' {
        $parameters.Remove('Confirm')
        $parameters.WhatIf = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldChange'
        $result.Output[0].TargetStateKnown | Should -BeFalse
        $result.Output[0].Fields | Should -Contain 'TemporaryAccess'
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
        Test-Path -LiteralPath $receiptPath | Should -BeFalse
        $result.Prompts | Should -Be 0
    }

    It 'ResumeCleanupDoesNotCreateSecret' {
        $fixture.RoleCleanupStatus = 500
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -Match 'CleanupFailed'
        $fixture.RoleCleanupStatus = 0
        $recovery = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.VaultId
            ResumeCleanup = $true; RecoveryReceiptPath = $receiptPath; NonInteractive = $true; Confirm = $false
        }
        $result = Invoke-TaskUnderTest $taskPath $recovery $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.Mutations.Count | Should -Be 1
        $fixture.RoleAssignments.Count | Should -Be 0
        $result.Output[0].Changed | Should -BeFalse
        $result.Output[0].CleanupStatus | Should -Be 'Completed'
    }

    It 'SessionDefaultsCannotAuthorizeAccessManagement' {
        $parameters.Remove('ManageTemporaryAccess')
        $fixture.DefaultParameterValues['*:ManageTemporaryAccess'] = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ConfirmationRequired'
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'LogsOnlySafeAuthContext' {
        $fixture.SecretReadStatus = 0
        $fixture.SecretVersions = @(New-SecretMetadata)
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.AllText | Should -Match ([regex]::Escape($fixture.PrincipalId))
        $result.AllText | Should -Not -Match ([regex]::Escape($fixture.LastToken))
        $result.AllText | Should -Not -Match 'test-only-account|test-only-private|SENSITIVE-PROVIDER-BODY'
        @($result.Information | Where-Object {
            $_.PSObject.Properties['TargetResourceId'] -and $_.TargetResourceId -eq $fixture.VaultId
        }).Count | Should -BeGreaterThan 0
    }

    It 'RecoveryRefusesAConcurrentAssignmentOwnershipChange' {
        $fixture.RoleCleanupStatus = 500
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -Match 'CleanupFailed'
        $fixture.RoleAssignments[0].Description = 'concurrently changed'
        $fixture.RoleCleanupStatus = 0
        $result = Invoke-TaskUnderTest $taskPath @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.VaultId
            ResumeCleanup = $true; RecoveryReceiptPath = $receiptPath; NonInteractive = $true; Confirm = $false
        } $fixture
        $result.ErrorText | Should -Match 'CleanupFailed'
        $result.Output.Count | Should -Be 0
        $fixture.RoleAssignments.Count | Should -Be 1
        $fixture.RoleAssignments[0].Description | Should -Be 'concurrently changed'
    }
}

Describe 'Ensure-KeyVaultSecret' {
    BeforeEach {
        $fixture = New-TaskFixture
        $parameters = @{
            TenantId = $fixture.Tenant
            SubscriptionId = $fixture.Subscription
            TargetResourceId = $fixture.VaultId
            SecretName = 'api-jwt'
            NonInteractive = $true
            Confirm = $false
        }
    }

    It 'PreservesAnExistingSecretWithoutRequestingAValue' {
        $fixture.SecretVersions = @(New-SecretMetadata)
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output.Count | Should -Be 1
        $result.Output[0].Status | Should -Be 'NoChange'
        $result.Output[0].Changed | Should -BeFalse
        $fixture.Mutations.Count | Should -Be 0
        $result.Prompts | Should -Be 0
    }

    It 'CreatesOnlyAnAbsentSecretAndIsSequentiallyIdempotent' {
        $parameters.SecretValue = ConvertTo-SecureString 'SENSITIVE-PROVIDER-BODY' -AsPlainText -Force
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $second = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -BeNullOrEmpty
        $second.ErrorText | Should -BeNullOrEmpty
        $first.Output.Count | Should -Be 1
        $first.Output[0].Status | Should -Be 'Changed'
        $second.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 1
        $fixture.Mutations[0].Arguments.Name | Should -Be 'api-jwt'
        $fixture.Mutations[0].Arguments.VaultName | Should -Be 'task-vault'
        $first.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'RejectsForbiddenMetadataWithoutLeakingProviderErrors' {
        $fixture.SecretReadStatus = 403
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SecretReadFailed'
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'CreatesAfterTypedNotFoundMetadata: <Case>' -ForEach @(
        @{ Case = 'active versions'; Active = $true; Removed = $false },
        @{ Case = 'deleted metadata'; Active = $false; Removed = $true }
    ) {
        $fixture.SecretNotFoundThrows = $Active
        $fixture.RemovedNotFoundThrows = $Removed
        $parameters.SecretValue = ConvertTo-SecureString 'synthetic' -AsPlainText -Force
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.Mutations.Count | Should -Be 1
    }

    It 'RejectsDisabledOrExpiredExistingSecret: <Case>' -ForEach @(
        @{ Case = 'disabled'; Enabled = $false; Expires = $null; NotBefore = $null },
        @{ Case = 'expired'; Enabled = $true; Expires = [datetime] '2000-01-01Z'; NotBefore = $null },
        @{ Case = 'not yet valid'; Enabled = $true; Expires = $null; NotBefore = [datetime] '2100-01-01Z' }
    ) {
        $fixture.SecretVersions = @(New-SecretMetadata -Enabled $Enabled -Expires $Expires -NotBefore $NotBefore)
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SecretUnusable'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'DoesNotFallBackToAnOlderUsableVersion' {
        $older = New-SecretMetadata
        $newer = New-SecretMetadata -Enabled $false
        $newer.Created = [datetime] '2026-02-01Z'
        $newer.Version = 'new-version'
        $fixture.SecretVersions = @($older, $newer)
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SecretUnusable'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'DeclineAndWhatIfDoNotWrite: <Case>' -ForEach @(
        @{ Case = 'manual decline'; Manual = $true; Preview = $false; Status = 'Declined' },
        @{ Case = 'noninteractive WhatIf without consent'; Manual = $false; Preview = $true; Status = 'WouldChange' }
    ) {
        $parameters.Remove('Confirm')
        $parameters.NonInteractive = -not $Manual
        $parameters.WhatIf = $Preview
        $parameters.SecretValue = ConvertTo-SecureString 'unused' -AsPlainText -Force
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be $Status
        $fixture.Mutations.Count | Should -Be 0
        if ($Manual) { $result.Prompts | Should -Be 1 }
        else { $result.Prompts | Should -Be 0 }
    }

    It 'RequiresExplicitAutomationConsentRatherThanAnAmbientPreference' {
        $parameters.Remove('Confirm')
        $parameters.SecretValue = ConvertTo-SecureString 'unused' -AsPlainText -Force
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ConfirmationRequired'
        $result.Prompts | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RequiresManualConfirmationDespiteAnExplicitBypass' {
        $parameters.NonInteractive = $false
        $parameters.SecretValue = ConvertTo-SecureString 'unused' -AsPlainText -Force
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.Output[0].Status | Should -Be 'Declined'
        $result.Prompts | Should -Be 1
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RejectsAmbiguousNoninteractiveScopeWithoutPrompting' {
        $parameters.Remove('TargetResourceId')
        $parameters.ResourceGroupName = 'task-tests'
        $parameters.VaultName = 'task-*'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'AmbiguousTarget'
        $result.Prompts | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'SupportsManualCandidateSelectionWithoutChoosingTheFirstMatch' {
        $other = $fixture.Resources[0].PSObject.Copy()
        $other.Name = 'task-other'
        $other.ResourceId = $fixture.VaultId -replace 'task-vault$', 'task-other'
        $other.Properties = [pscustomobject]@{ vaultUri = 'https://task-other.vault.azure.net/' }
        $fixture.Resources = @($fixture.Resources[0], $other)
        $parameters.Remove('TargetResourceId')
        $parameters.ResourceGroupName = 'task-tests'
        $parameters.VaultName = 'task-*'
        $parameters.NonInteractive = $false
        $parameters.SecretValue = ConvertTo-SecureString 'unused' -AsPlainText -Force
        $fixture.Inputs = @('2')
        $fixture.SecretVersions = @(New-SecretMetadata)
        $fixture.SecretVersions[0].VaultName = 'task-other'
        $fixture.SecretVersions[0].Id = 'https://task-other.vault.azure.net/secrets/api-jwt/first-version'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].TargetResourceId | Should -Be $other.ResourceId
        $result.Prompts | Should -Be 1
    }

    It 'RejectsContextMismatch' {
        $fixture.Context.Tenant.Id = '33333333-3333-4333-8333-333333333333'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ContextMismatch'
        $fixture.Mutations.Count | Should -Be 0
        @($fixture.Calls | Where-Object Name -eq 'Get-AzResource').Count | Should -Be 0
    }

    It 'RejectsACrossSubscriptionResource' {
        $parameters.TargetResourceId = $fixture.VaultId -replace $fixture.Subscription, '33333333-3333-4333-8333-333333333333'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetScope'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RechecksAbsenceWithoutLeakingSecret' {
        $fixture.SecretAppearsOnRead = 2
        $parameters.SecretValue = ConvertTo-SecureString 'SENSITIVE-PROVIDER-BODY' -AsPlainText -Force
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'RefusesASoftDeletedSecretRatherThanRecoveringOrReplacingIt' {
        $fixture.RemovedSecrets = @(New-SecretMetadata)
        $parameters.SecretValue = ConvertTo-SecureString 'unused' -AsPlainText -Force
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SecretSoftDeleted'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RequiresAValueOnlyAfterAbsenceIsKnown' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SecretValueRequired'
        $result.Prompts | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RedactsWriteFailureAndNeverClaimsSuccess' {
        $fixture.SecretWriteStatus = 409
        $parameters.SecretValue = ConvertTo-SecureString 'SENSITIVE-PROVIDER-BODY' -AsPlainText -Force
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SecretWriteFailed'
        $result.Output.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }
}
