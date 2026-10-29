BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Set-AppConfigurationValue.ps1'
}

Describe 'Set-AppConfigurationValue scoped access' {
    BeforeEach {
        $fixture = New-TaskFixture
        $fixture.AppReadStatus = 403
        $receiptPath = Join-Path $TestDrive "$([guid]::NewGuid()).json"
        $fixture.ExpectedReceiptPath = $receiptPath
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.StoreId
            Key = 'Feature:Name'; Label = 'DEVELOPMENT'; Value = 'test-only-private-value'; ContentType = ''
            ManageTemporaryAccess = $true; RecoveryReceiptPath = $receiptPath; NonInteractive = $true; Confirm = $false
        }
    }

    It 'StoreLeasePreservesTagsAndEtagBehavior' {
        $fixture.Settings.Add((New-Setting -Tag @{ owner = 'keep' }))
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].CleanupStatus | Should -Be 'Completed'
        $result.Output[0].AccessChanged | Should -BeTrue
        $fixture.Settings[0].Tag.owner | Should -Be 'keep'
        $fixture.Mutations[0].Arguments.IfMatch | Should -Be '"first-etag"'
        $fixture.RoleAssignments.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'test-only-private-value'
    }

    It 'FailureCleansEveryOwnedLease' {
        $fixture.AppWriteStatus = 500
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SettingWriteFailed'
        $result.Output.Count | Should -Be 0
        $fixture.RoleAssignments.Count | Should -Be 0
        ($fixture.AccessMutations.Name -join ',') | Should -Be 'Grant,Revoke'
    }

    It 'PreexistingRolesAreNotRemoved' {
        $fixture.RoleAssignments.Add([pscustomobject]@{
            RoleAssignmentId = "$($fixture.StoreId)/providers/Microsoft.Authorization/roleAssignments/66666666-6666-4666-8666-666666666666"
            ObjectId = $fixture.PrincipalId; Scope = $fixture.StoreId
            RoleDefinitionId = '5ae67dd6-50cb-40e7-96ff-dc2bfa4b606b'; Description = 'pre-existing'; Condition = ''
        })
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.RoleAssignments.Count | Should -Be 1
        $result.Output[0].AccessChanged | Should -BeFalse
    }

    It 'ContextChangeStopsTargetWrites' {
        $fixture.AppReadStatus = 0
        $fixture.ChangeContextAfterAppRead = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ContextMismatch'
        $fixture.Mutations.Count | Should -Be 0
        $fixture.AccessMutations.Count | Should -Be 0
    }

    It 'ReceiptContainsNoValues' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $text = Get-Content -LiteralPath $receiptPath -Raw
        $text | Should -Not -Match 'test-only-private-value|SENSITIVE-PROVIDER-BODY|test-only-account'
        $receipt = $text | ConvertFrom-Json
        $receipt.OwnedRoleAssignments[0].Scope | Should -Be $fixture.StoreId
        $receipt.Cleanup.Status | Should -Be 'Completed'
    }

    It 'WhatIfDefersProtectedStateWithoutAccessOrReceiptWrites' {
        $parameters.Remove('Confirm')
        $parameters.WhatIf = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldChange'
        $result.Output[0].TargetStateKnown | Should -BeFalse
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
        Test-Path -LiteralPath $receiptPath | Should -BeFalse
    }

    It 'ResumeCleanupNeverRepeatsTheSettingWrite' {
        $fixture.RoleCleanupStatus = 500
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -Match 'CleanupFailed'
        $first.Output.Count | Should -Be 0
        $fixture.RoleCleanupStatus = 0
        $result = Invoke-TaskUnderTest $taskPath @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.StoreId
            ResumeCleanup = $true; RecoveryReceiptPath = $receiptPath; NonInteractive = $true; Confirm = $false
        } $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.Mutations.Count | Should -Be 1
        $fixture.RoleAssignments.Count | Should -Be 0
        $result.Output[0].Changed | Should -BeFalse
    }

    It 'DefaultsCannotAuthorizeTemporaryAccess' {
        $parameters.Remove('ManageTemporaryAccess')
        $fixture.DefaultParameterValues['*:ManageTemp*'] = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ConfirmationRequired'
        $fixture.AccessMutations.Count | Should -Be 0
    }
}

Describe 'Set-AppConfigurationValue' {
    BeforeEach {
        $fixture = New-TaskFixture
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.StoreId
            Key = 'Feature:Name'; Label = 'DEVELOPMENT'; Value = 'after'; ContentType = ''
            NonInteractive = $true; Confirm = $false
        }
    }

    It 'IdenticalValueIsNoChange' {
        $fixture.Settings.Add((New-Setting -Value 'after'))
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output.Count | Should -Be 1
        $result.Output[0].Status | Should -Be 'NoChange'
        ($result.Output[0].Fields -join ',') | Should -Be 'Value,ContentType'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'EmptyOrdinaryValueIsSupportedAndIsNotEmitted' {
        $fixture.Settings.Add((New-Setting -Value 'SENSITIVE-PROVIDER-BODY'))
        $parameters.Value = ''
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.Settings[0].Value | Should -BeExactly ''
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'CreatesOnlyTheSelectedKeyLabelWithCasePreserved' {
        $fixture.Settings.Add((New-Setting -Key 'feature:name'))
        $fixture.Settings.Add((New-Setting -Label 'development'))
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.Settings.Count | Should -Be 3
        $fixture.Settings[0].Value | Should -Be 'before'
        $fixture.Settings[1].Value | Should -Be 'before'
        $fixture.Settings[2].Key | Should -BeExactly 'Feature:Name'
        $fixture.Settings[2].Label | Should -BeExactly 'DEVELOPMENT'
        $fixture.Mutations.Count | Should -Be 1
        $fixture.Mutations[0].Arguments.IfNoneMatch | Should -Be '*'
    }

    It 'PreservesUnownedMetadataAndMergesOnlyProvidedTags' {
        $fixture.Settings.Add((New-Setting -Tag @{ owner = 'keep'; changed = 'old' }))
        $parameters.Tags = @{ changed = 'new' }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.Settings[0].Tag.owner | Should -Be 'keep'
        $fixture.Settings[0].Tag.changed | Should -Be 'new'
        $fixture.Settings[0].Description | Should -Be 'Unowned description'
        $result.Output[0].Fields | Should -Contain 'Tags'
        $fixture.Mutations[0].Arguments.IfMatch | Should -Be '"first-etag"'
    }

    It 'RefusesReferenceTypeConflict: <Where>' -ForEach @(
        @{ Where = 'existing'; Existing = $true }, @{ Where = 'requested'; Existing = $false }
    ) {
        $referenceType = 'application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8'
        if ($Existing) { $fixture.Settings.Add((New-Setting -ContentType $referenceType)) }
        else { $parameters.ContentType = $referenceType }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ContentTypeConflict'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RefusesLockedOrUnreadableState: <Case>' -ForEach @(
        @{ Case = 'locked'; Locked = $true; Status = 0; Code = 'SettingLocked' },
        @{ Case = 'forbidden'; Locked = $false; Status = 403; Code = 'SettingReadFailed' },
        @{ Case = 'missing endpoint'; Locked = $false; Status = 404; Code = 'SettingReadFailed' }
    ) {
        $fixture.Settings.Add((New-Setting -Locked $Locked))
        $fixture.AppReadStatus = $Status
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match $Code
        $fixture.Mutations.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'UsesEtagPreconditionsAndDoesNotRepeatSatisfiedWrites' {
        $fixture.Settings.Add((New-Setting))
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $second = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -BeNullOrEmpty
        $second.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 1
        $fixture.Mutations[0].Arguments.IfMatch | Should -Be '"first-etag"'
        $fixture.Mutations[0].Arguments.ContainsKey('IfNoneMatch') | Should -BeFalse
    }

    It 'StaleEtagFailsUnlessRecheckIsAlreadySatisfied: <Case>' -ForEach @(
        @{ Case = 'still different'; Satisfied = $false }, @{ Case = 'now satisfied'; Satisfied = $true }
    ) {
        $fixture.Settings.Add((New-Setting))
        $fixture.AppWriteStatus = 412
        $fixture.AppConflictSatisfies = $Satisfied
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        if ($Satisfied) {
            $result.ErrorText | Should -BeNullOrEmpty
            $result.Output[0].Status | Should -Be 'NoChange'
        }
        else { $result.ErrorText | Should -Match 'StaleState' }
        @($fixture.Calls | Where-Object Name -eq 'Set-AzAppConfigurationKeyValue').Count | Should -Be 1
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'TargetsTheNoLabelSettingAndEscapesLiteralFilterCharacters' {
        $parameters.Key = 'literal*,\key'
        $parameters.Label = ''
        $fixture.Settings.Add((New-Setting -Key $parameters.Key -Label 'PRODUCTION'))
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $second = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -BeNullOrEmpty
        $second.ErrorText | Should -BeNullOrEmpty
        $first.Output[0].Status | Should -Be 'Changed'
        $second.Output[0].Status | Should -Be 'NoChange'
        $fixture.Settings.Count | Should -Be 2
        $read = @($fixture.Calls | Where-Object Name -eq 'Get-AzAppConfigurationKeyValue')[0]
        $read.Arguments.Key | Should -BeExactly 'literal\*\,\\key'
        $read.Arguments.Label | Should -BeExactly ([string][char] 0)
        $read.Arguments.ContainsKey('After') | Should -BeTrue
    }

    It 'DeclineAndWhatIfDoNotWrite: <Case>' -ForEach @(
        @{ Case = 'decline'; Manual = $true; Preview = $false; Expected = 'Declined' },
        @{ Case = 'WhatIf'; Manual = $false; Preview = $true; Expected = 'WouldChange' }
    ) {
        $parameters.Remove('Confirm')
        $parameters.NonInteractive = -not $Manual
        $parameters.WhatIf = $Preview
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be $Expected
        $fixture.Mutations.Count | Should -Be 0
        if (-not $Manual) { $result.Prompts | Should -Be 0 }
    }

    It 'RejectsMissingAutomationConsent' {
        $parameters.Remove('Confirm')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ConfirmationRequired'
        $result.Prompts | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RejectsContextMismatch' {
        $fixture.Context.Subscription.Id = '33333333-3333-4333-8333-333333333333'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ContextMismatch'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RejectsAmbiguousNoninteractiveScope' {
        $parameters.Remove('TargetResourceId')
        $parameters.ResourceGroupName = 'task-tests'
        $parameters.StoreName = 'task-*'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'AmbiguousTarget'
        $result.Prompts | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RequiresExplicitLabelValueAndContentTypeWithoutPrompting' {
        $parameters.Remove('Label')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'InvalidInput'
        $result.Prompts | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }
}
