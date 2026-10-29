BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Remove-AiDeployment.ps1'
}

Describe 'Remove-AiDeployment' {
    BeforeEach {
        $fixture = New-TaskFixture
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription
            TargetResourceId = "$($fixture.AiAccountId)/deployments/main"; NonInteractive = $true; Confirm = $false
        }
    }

    It 'DeletesOnlyConfirmedDeployment' {
        $other = $fixture.AiDeployments[0].Clone()
        $other.id = "$($fixture.AiAccountId)/deployments/other"; $other.name = 'other'
        $fixture.AiDeployments.Add($other)
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.AiDeployments.Count | Should -Be 1
        $fixture.AiDeployments[0].name | Should -Be 'other'
        $fixture.Mutations.Count | Should -Be 1
        $fixture.Mutations[0].Id | Should -Be $parameters.TargetResourceId
    }

    It 'DiscoversOnlyScopedDeployments' {
        $parameters.Remove('TargetResourceId')
        $parameters.ResourceGroupName = 'task-tests'; $parameters.AccountName = 'task-ai'; $parameters.DeploymentName = 'main'
        $parameters.WhatIf = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldChange'
        @($fixture.ArmRequests | Where-Object { $_.Path -notlike ($fixture.AiAccountId + '/deployments*') }).Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'DoesNotChooseFirstAmbiguousCandidate' {
        $second = $fixture.AiDeployments[0].Clone()
        $second.id = "$($fixture.AiAccountId)/deployments/second"; $second.name = 'second'
        $fixture.AiDeployments.Add($second)
        $parameters.Remove('TargetResourceId'); $parameters.Remove('NonInteractive'); $parameters.Remove('Confirm')
        $parameters.ResourceGroupName = 'task-tests'; $parameters.AccountName = 'task-ai'; $parameters.DeploymentName = '*'
        $fixture.Inputs = @('2')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Declined'
        $result.Output[0].TargetResourceId | Should -Be $second.id
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'AlreadyAbsentIsNoChange' {
        $fixture.AiDeployments.Clear()
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'StateChangeRequiresNewConfirmation' {
        $fixture.AiChangeDeploymentOnRead = 2
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'StateConflict'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'WaitsForDeletingStateWithoutRepeatingDelete' {
        $fixture.AiDeletePendingReads = 2
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.AiDeployments.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 1
    }

    It 'DoesNotDeleteARecreatedDeploymentDuringVerification' {
        $fixture.AiRecreateAfterDelete = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'StateConflict'
        $fixture.AiDeployments.Count | Should -Be 1
        $fixture.Mutations.Count | Should -Be 1
    }

    It 'RejectsUrlControlCharactersInResourceScope' {
        $parameters.TargetResourceId = $parameters.TargetResourceId -replace 'task-tests', 'task-tests#other'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetScope'
        $fixture.ArmRequests.Count | Should -Be 0
    }

    It 'WhatIfDeclineAndUnapprovedAutomationDoNotDelete: <Case>' -ForEach @(
        @{ Case = 'WhatIf'; Preview = $true; Automation = $true; Expected = 'WouldChange' },
        @{ Case = 'decline'; Preview = $false; Automation = $false; Expected = 'Declined' },
        @{ Case = 'automation'; Preview = $false; Automation = $true; Expected = 'ConfirmationRequired' }
    ) {
        $parameters.Remove('Confirm'); $parameters.NonInteractive = $Automation; $parameters.WhatIf = $Preview
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        if ($Expected -eq 'ConfirmationRequired') { $result.ErrorText | Should -Match $Expected }
        else { $result.ErrorText | Should -BeNullOrEmpty; $result.Output[0].Status | Should -Be $Expected }
        $fixture.Mutations.Count | Should -Be 0
        if ($Automation) { $result.Prompts | Should -Be 0 }
    }

    It 'ForbiddenIsNotAlreadyAbsent' {
        $fixture.AiReadStatus = 403
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetReadFailed'
        $result.Output.Count | Should -Be 0
    }

    It 'DefaultsCannotAuthorizeDelete' {
        $parameters.Remove('Confirm')
        $fixture.DefaultParameterValues['*:Con*'] = $false
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ConfirmationRequired'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'ContextLogsContainNoKeys' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.AllText | Should -Match 'gpt-4.1-mini|GlobalStandard'
        $result.AllText | Should -Not -Match 'test-only-account|SENSITIVE-PROVIDER-BODY'
        $result.AllText | Should -Not -Match ([regex]::Escape($fixture.LastToken))
        $fixture.AccessMutations.Count | Should -Be 0
    }

    It 'RejectsCrossSubscriptionBeforeReading' {
        $parameters.TargetResourceId = $parameters.TargetResourceId -replace $fixture.Subscription, '99999999-9999-4999-8999-999999999999'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetScope'
        $fixture.ArmRequests.Count | Should -Be 0
    }
}
