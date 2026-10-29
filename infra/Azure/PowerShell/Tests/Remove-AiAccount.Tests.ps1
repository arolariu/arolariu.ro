BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Remove-AiAccount.ps1'
}

Describe 'Remove-AiAccount' {
    BeforeEach {
        $fixture = New-TaskFixture
        $fixture.AiDeployments.Clear()
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription
            TargetResourceId = $fixture.AiAccountId; NonInteractive = $true; Confirm = $false
        }
    }

    It 'RequiresExplicitAccountSelection' {
        $other = $fixture.AiAccounts[0].Clone()
        $other.id = $fixture.AiAccountId -replace 'task-ai$', 'other-ai'; $other.name = 'other-ai'
        $fixture.AiAccounts.Add($other)
        $parameters.Remove('TargetResourceId'); $parameters.Remove('NonInteractive'); $parameters.Remove('Confirm')
        $parameters.ResourceGroupName = 'task-tests'; $parameters.AccountName = '*'
        $fixture.Inputs = @('2')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Declined'
        $result.Output[0].TargetResourceId | Should -Be $other.id
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RemainingDeploymentsBlockDeletion' {
        $fixture.AiDeployments.Add(@{ id = "$($fixture.AiAccountId)/deployments/model"; name = 'model' })
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'DeploymentsRemain'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RechecksDeploymentsAfterConfirmation' {
        $fixture.AiAddDeploymentOnAccountRead = 2
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'DeploymentsRemain'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'PreservesUnrelatedAndRecreatedAccounts' {
        $other = $fixture.AiAccounts[0].Clone()
        $other.id = $fixture.AiAccountId -replace 'task-ai$', 'other-ai'; $other.name = 'other-ai'
        $fixture.AiAccounts.Add($other)
        $fixture.AiChangeAccountOnRead = 2
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'StateConflict'
        $fixture.AiAccounts.Count | Should -Be 2
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'DeletesActiveAccountOnly' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.AiAccounts.Count | Should -Be 0
        $fixture.AiDeletedAccounts.Count | Should -Be 1
        $fixture.Mutations[0].Name | Should -Be 'DeleteAiAccount'
        $fixture.Mutations.Count | Should -Be 1
    }

    It 'SoftDeletedStateIsNotAutoPurged' {
        $fixture.AiDeletedAccounts.Add($fixture.AiAccounts[0])
        $fixture.AiAccounts.Clear()
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'NoChange'
        $fixture.AiDeletedAccounts.Count | Should -Be 1
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'AuthorizationFailureIsNotAbsence' {
        $fixture.AiReadStatus = 403
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetReadFailed'
        $result.Output.Count | Should -Be 0
    }

    It 'RecreatedAfterDeleteIsNotDeletedAgain' {
        $fixture.AiRecreateAccountAfterDelete = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'StateConflict'
        $fixture.AiAccounts.Count | Should -Be 1
        $fixture.Mutations.Count | Should -Be 1
    }

    It 'PreviewAndMissingConsentCannotDelete: <Case>' -ForEach @(
        @{ Case = 'preview'; Preview = $true }, @{ Case = 'missing consent'; Preview = $false }
    ) {
        $parameters.Remove('Confirm'); $parameters.WhatIf = $Preview
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        if ($Preview) { $result.ErrorText | Should -BeNullOrEmpty; $result.Output[0].Status | Should -Be 'WouldChange' }
        else { $result.ErrorText | Should -Match 'ConfirmationRequired' }
        $fixture.Mutations.Count | Should -Be 0
    }
}
