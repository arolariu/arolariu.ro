BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
}

Describe 'Owned write authority propagation: <TaskName>' -ForEach @(
    @{ TaskName = 'Ensure-KeyVaultSecret' },
    @{ TaskName = 'Set-AppConfigurationValue' },
    @{ TaskName = 'Set-AppConfigurationKeyVaultReference' }
) {
    BeforeEach {
        $fixture = New-TaskFixture
        $taskPath = Join-Path (Split-Path $PSScriptRoot) "$TaskName.ps1"
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription
            ManageTemporaryAccess = $true; RecoveryReceiptPath = (Join-Path $TestDrive "$([guid]::NewGuid()).json")
            AccessPropagationTimeoutSeconds = 10; NonInteractive = $true; Confirm = $false
        }
        if ($TaskName -eq 'Ensure-KeyVaultSecret') {
            $parameters.TargetResourceId = $fixture.VaultId; $parameters.SecretName = 'api-jwt'
            $parameters.SecretValue = ConvertTo-SecureString 'synthetic-private-value' -AsPlainText -Force
            $reader = '21090545-7ca7-4776-b22c-e363652d74d2'; $scope = $fixture.VaultId
            $fixture.SecretWriteForbiddenUntil = $fixture.Clock.AddSeconds(4)
        }
        else {
            $parameters.TargetResourceId = $fixture.StoreId; $parameters.Key = 'Feature:Name'; $parameters.Label = 'DEVELOPMENT'
            $fixture.Settings.Add((New-Setting -Tag @{ owner = 'keep' }))
            $reader = '516239f1-63e1-4d78-a4de-a74fb236a071'; $scope = $fixture.StoreId
            $fixture.AppWriteForbiddenUntil = $fixture.Clock.AddSeconds(4)
            if ($TaskName -eq 'Set-AppConfigurationValue') { $parameters.Value = 'after'; $parameters.ContentType = '' }
            else {
                $parameters.VaultResourceId = $fixture.VaultId; $parameters.SecretName = 'api-jwt'
                $fixture.SecretVersions = @(New-SecretMetadata)
            }
        }
        $fixture.RoleAssignments.Add([pscustomobject]@{
            RoleAssignmentId = "$scope/providers/Microsoft.Authorization/roleAssignments/66666666-6666-4666-8666-666666666666"
            ObjectId = $fixture.PrincipalId; Scope = $scope; RoleDefinitionId = $reader; Description = 'pre-existing reader'; Condition = ''
        })
    }

    It 'WaitsForWritePermissionWhilePreservingExistingReaderAndConditionalState' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $result.Output[0].CleanupStatus | Should -Be 'Completed'
        $fixture.RoleAssignments.Count | Should -Be 1
        $fixture.RoleAssignments[0].Description | Should -Be 'pre-existing reader'
        $fixture.Mutations.Count | Should -Be 1
        if ($TaskName -ne 'Ensure-KeyVaultSecret') {
            $fixture.Mutations[0].Arguments.IfMatch | Should -Be '"first-etag"'
            $fixture.Settings[0].Tag.owner | Should -Be 'keep'
        }
    }

    It 'TimesOutAndCleansUpWithoutAFalseSuccessOrBusinessWrite' {
        $parameters.AccessPropagationTimeoutSeconds = 2
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'AccessPropagationTimeout'
        $result.Output.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
        $fixture.RoleAssignments.Count | Should -Be 1
        ($fixture.AccessMutations.Name -join ',') | Should -Be 'Grant,Revoke'
    }

    It 'DoesNotOverwriteConcurrentStateDuringAPropagationWait' {
        if ($TaskName -eq 'Ensure-KeyVaultSecret') { $fixture.SecretAppearsOnPropagationSleep = $true }
        else { $fixture.ConcurrentSettingOnPropagationSleep = $true }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        if ($TaskName -eq 'Ensure-KeyVaultSecret') {
            $result.ErrorText | Should -BeNullOrEmpty
            $result.Output[0].Status | Should -Be 'NoChange'
        }
        else {
            $result.ErrorText | Should -Match 'StaleState'
            $fixture.Settings[0].Value | Should -Be 'concurrently changed'
        }
        $fixture.Mutations.Count | Should -Be 0
        $fixture.RoleAssignments.Count | Should -Be 1
    }

    It 'DoesNotRetryNonForbiddenWriteFailures' {
        $before = $fixture.Clock
        if ($TaskName -eq 'Ensure-KeyVaultSecret') {
            $fixture.SecretWriteForbiddenUntil = $null; $fixture.SecretWriteStatus = 500
        }
        else { $fixture.AppWriteForbiddenUntil = $null; $fixture.AppWriteStatus = 500 }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match '(Secret|Setting)WriteFailed'
        $fixture.Clock | Should -Be $before
        $fixture.Mutations.Count | Should -Be 0
        ($fixture.AccessMutations.Name -join ',') | Should -Be 'Grant,Revoke'
        $fixture.RoleAssignments.Count | Should -Be 1
    }

    It 'DoesNotTreatPreExistingWriterAuthorityAsAnOwnedPropagationLease' {
        $before = $fixture.Clock
        $fixture.RoleAssignments[0].RoleDefinitionId = if ($TaskName -eq 'Ensure-KeyVaultSecret') {
            'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
        }
        else { '5ae67dd6-50cb-40e7-96ff-dc2bfa4b606b' }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match '(Secret|Setting)WriteFailed'
        $fixture.Clock | Should -Be $before
        $fixture.Mutations.Count | Should -Be 0
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.RoleAssignments.Count | Should -Be 1
    }

    It 'StopsWhenTheActorChangesDuringPropagationAndCleansOnlyTheOriginalLease' {
        $fixture.ChangePrincipalOnPropagationSleep = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ContextActorChanged'
        $fixture.Mutations.Count | Should -Be 0
        ($fixture.AccessMutations.Name -join ',') | Should -Be 'Grant,Revoke'
        $fixture.RoleAssignments.Count | Should -Be 1
    }
}
