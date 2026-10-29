BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Remove-DeletedAiAccount.ps1'
}

Describe 'Remove-DeletedAiAccount' {
    BeforeEach {
        $fixture = New-TaskFixture
        $fixture.AiAccounts.Clear()
        $deletedId = "/subscriptions/$($fixture.Subscription)/providers/Microsoft.CognitiveServices/locations/swedencentral/resourceGroups/task-tests/deletedAccounts/task-ai"
        $fixture.AiDeletedAccounts.Add(@{
            id = $deletedId; name = 'task-ai'; type = 'Microsoft.CognitiveServices/accounts'; kind = 'OpenAI'; location = 'swedencentral'
            etag = 'deleted-first'; properties = @{ deletionDate = '2026-02-01T00:00:00Z'; dateCreated = '2026-01-01T00:00:00Z' }
        })
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $deletedId
            AcknowledgePermanentDeletion = $deletedId; NonInteractive = $true; Confirm = $false
        }
    }

    It 'DiscoversDeletedAccountWithoutLiveGroup' {
        $parameters.Remove('TargetResourceId'); $parameters.Remove('NonInteractive'); $parameters.Remove('Confirm')
        $parameters.Remove('AcknowledgePermanentDeletion'); $parameters.ResourceGroupName = 'task-tests'
        $parameters.Location = 'swedencentral'; $parameters.AccountName = '*'; $parameters.WhatIf = $true
        $fixture.Inputs = @('1')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldChange'
        $result.Output[0].TargetResourceId | Should -Be $deletedId
        @($fixture.Calls | Where-Object Name -eq 'Get-AzResource').Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RequiresExactPermanentAcknowledgement: <Case>' -ForEach @(
        @{ Case = 'missing'; Missing = $true }, @{ Case = 'different'; Missing = $false }
    ) {
        if ($Missing) { $parameters.Remove('AcknowledgePermanentDeletion') }
        else { $parameters.AcknowledgePermanentDeletion = $fixture.AiAccountId }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'PurgeAcknowledgementRequired'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'NormalizesOriginalActiveIdsReturnedByDeletedInventory' {
        $fixture.AiListDeletedOriginalIds = $true
        $parameters.Remove('TargetResourceId'); $parameters.Remove('NonInteractive'); $parameters.Remove('Confirm')
        $parameters.Remove('AcknowledgePermanentDeletion')
        $parameters.ResourceGroupName = 'task-tests'; $parameters.Location = 'swedencentral'; $parameters.AccountName = '*'; $parameters.WhatIf = $true
        $fixture.Inputs = @('1')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].TargetResourceId | Should -Be $deletedId
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'PurgesOnlySelectedDeletedRecord' {
        $other = $fixture.AiDeletedAccounts[0].Clone()
        $other.id = $deletedId -replace 'task-ai$', 'other-ai'; $other.name = 'other-ai'
        $fixture.AiDeletedAccounts.Add($other)
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.AiDeletedAccounts.Count | Should -Be 1
        $fixture.AiDeletedAccounts[0].name | Should -Be 'other-ai'
        $fixture.Mutations[0].Name | Should -Be 'PurgeDeletedAiAccount'
    }

    It 'ActiveOrRecoveredAccountIsNotDeleted' {
        $fixture.AiAccounts.Add(@{
            id = $fixture.AiAccountId; name = 'task-ai'; kind = 'OpenAI'; type = 'Microsoft.CognitiveServices/accounts'
            location = 'swedencentral'; properties = @{ provisioningState = 'Succeeded' }
        })
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ActiveAccountExists'
        $fixture.Mutations.Count | Should -Be 0
        $fixture.AiAccounts.Count | Should -Be 1
    }

    It 'MissingPurgeAuthorityDoesNotGrantSubscriptionContributor' {
        $fixture.AiPurgeStatus = 403
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'PurgeAuthorityRequired'
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'RepeatedAbsentPurgeIsNoChange' {
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $second = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -BeNullOrEmpty
        $second.ErrorText | Should -BeNullOrEmpty
        $second.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 1
    }

    It 'DifferentDeletionGenerationIsNotPurged' {
        $fixture.AiChangeDeletedOnRead = 2
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'StateConflict'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'WrongTenantScopeDefaultConsentAndWhatIfCannotPurge: <Case>' -ForEach @(
        @{ Case = 'tenant'; Code = 'ContextMismatch' },
        @{ Case = 'default acknowledgement'; Code = 'ConfirmationRequired' },
        @{ Case = 'WhatIf'; Code = '' }
    ) {
        switch ($Case) {
            'tenant' { $parameters.TenantId = '99999999-9999-4999-8999-999999999999' }
            'default acknowledgement' {
                $parameters.Remove('AcknowledgePermanentDeletion')
                $fixture.DefaultParameterValues['*:Acknowledge*'] = $deletedId
            }
            'WhatIf' { $parameters.WhatIf = $true; $parameters.Remove('AcknowledgePermanentDeletion'); $parameters.Remove('Confirm') }
        }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        if ($Code) { $result.ErrorText | Should -Match $Code }
        else { $result.ErrorText | Should -BeNullOrEmpty; $result.Output[0].Status | Should -Be 'WouldChange' }
        $fixture.Mutations.Count | Should -Be 0
        $fixture.AccessMutations.Count | Should -Be 0
    }
}
