BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Ensure-KeyVaultSecret.ps1'
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
