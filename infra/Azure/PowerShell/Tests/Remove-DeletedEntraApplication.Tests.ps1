BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Remove-DeletedEntraApplication.ps1'
}

Describe 'Remove-DeletedEntraApplication' {
    BeforeEach {
        $fixture = New-TaskFixture
        $fixture.EntraApplicationDeleted = $true; $fixture.EntraServicePrincipalDeleted = $true
        $deleted = $fixture.EntraApplication.Clone(); $deleted.deletedDateTime = '2026-02-01T00:00:00Z'
        $fixture.EntraDeletedObjects.Add($deleted)
        $parameters = @{
            TenantId = $fixture.Tenant; ApplicationObjectId = $fixture.EntraApplication.id
            ExpectedApplicationClientId = $fixture.ApplicationClientId; AcknowledgePermanentDeletion = $fixture.EntraApplication.id
            NonInteractive = $true; Confirm = $false
        }
    }

    It 'SelectsOnlyDeletedApplicationType' {
        $fixture.EntraDeletedObjects[0]['@odata.type'] = '#microsoft.graph.user'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'DeletedObjectTypeMismatch'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RequiresExactObjectAcknowledgement: <Case>' -ForEach @(
        @{ Case = 'missing'; Missing = $true }, @{ Case = 'client ID instead of object'; Missing = $false }
    ) {
        if ($Missing) { $parameters.Remove('AcknowledgePermanentDeletion') }
        else { $parameters.AcknowledgePermanentDeletion = $fixture.ApplicationClientId }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'PurgeAcknowledgementRequired'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RejectsLiveRecoveredForeignOrMismatchedObject: <Case>' -ForEach @(
        @{ Case = 'recovered'; Code = 'ActiveObjectExists' },
        @{ Case = 'foreign'; Code = 'ApplicationOwnershipMismatch' },
        @{ Case = 'client mismatch'; Code = 'ClientIdMismatch' }
    ) {
        switch ($Case) {
            'recovered' { $fixture.EntraApplicationDeleted = $false }
            'foreign' { $fixture.EntraDeletedObjects[0].signInAudience = 'AzureADMultipleOrgs' }
            'client mismatch' { $parameters.ExpectedApplicationClientId = '99999999-9999-4999-8999-999999999999' }
        }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match $Code
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'PurgesNoLinkedObjectImplicitly' {
        $linked = $fixture.EntraServicePrincipal.Clone(); $linked.deletedDateTime = '2026-02-01T00:00:00Z'
        $fixture.EntraDeletedObjects.Add($linked)
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.EntraDeletedObjects.Count | Should -Be 1
        $fixture.EntraDeletedObjects[0].id | Should -Be $fixture.EntraServicePrincipal.id
        $fixture.Mutations.Count | Should -Be 1
    }

    It 'ForbiddenReadIsNotAbsent' {
        $fixture.GraphReadStatus = 403
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'GraphReadFailed'
        $result.Output.Count | Should -Be 0
    }

    It 'RepeatedPurgeIsNoChange' {
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $second = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -BeNullOrEmpty
        $second.ErrorText | Should -BeNullOrEmpty
        $second.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 1
    }

    It 'RereadsDeletionGenerationBeforePurge' {
        $fixture.GraphChangeDeletedOnRead = 2
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'StateConflict'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'DefaultAcknowledgementAndPreviewCannotPurge: <Case>' -ForEach @(
        @{ Case = 'default'; Preview = $false }, @{ Case = 'WhatIf'; Preview = $true }
    ) {
        $parameters.Remove('AcknowledgePermanentDeletion')
        if ($Preview) { $parameters.WhatIf = $true; $parameters.Remove('Confirm') }
        else { $fixture.DefaultParameterValues['*:Acknowledge*'] = $fixture.EntraApplication.id }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        if ($Preview) { $result.ErrorText | Should -BeNullOrEmpty; $result.Output[0].Status | Should -Be 'WouldChange' }
        else { $result.ErrorText | Should -Match 'ConfirmationRequired' }
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'ManualDeletedDiscoveryBindsTheSelectedClientId' {
        $parameters.Remove('ApplicationObjectId'); $parameters.Remove('ExpectedApplicationClientId'); $parameters.Remove('NonInteractive')
        $parameters.Remove('Confirm'); $parameters.Remove('AcknowledgePermanentDeletion'); $parameters.DisplayName = 'Task*'; $parameters.WhatIf = $true
        $fixture.Inputs = @('1')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldChange'
        $result.Output[0].Subject | Should -Be $fixture.ApplicationClientId
    }
}
