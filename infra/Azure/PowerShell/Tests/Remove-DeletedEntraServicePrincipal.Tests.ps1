BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Remove-DeletedEntraServicePrincipal.ps1'
}

Describe 'Remove-DeletedEntraServicePrincipal' {
    BeforeEach {
        $fixture = New-TaskFixture
        $fixture.EntraServicePrincipalDeleted = $true
        $deleted = $fixture.EntraServicePrincipal.Clone(); $deleted.deletedDateTime = '2026-02-01T00:00:00Z'
        $fixture.EntraDeletedObjects.Add($deleted)
        $parameters = @{
            TenantId = $fixture.Tenant; ServicePrincipalObjectId = $fixture.EntraServicePrincipal.id
            ExpectedApplicationClientId = $fixture.ApplicationClientId; AcknowledgePermanentDeletion = $fixture.EntraServicePrincipal.id
            NonInteractive = $true; Confirm = $false
        }
    }

    It 'SelectsOnlyEligibleDeletedServicePrincipal' {
        $fixture.EntraDeletedObjects[0]['@odata.type'] = '#microsoft.graph.group'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'DeletedObjectTypeMismatch'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'PreservesApplicationAndOtherDeletedItems' {
        $fixture.EntraDeletedObjects.Add(@{ id = 'cccccccc-1111-4111-8111-cccccccccccc'; '@odata.type' = '#microsoft.graph.user' })
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.EntraApplicationDeleted | Should -BeFalse
        $fixture.EntraDeletedObjects.Count | Should -Be 1
        $fixture.EntraDeletedObjects[0]['@odata.type'] | Should -Be '#microsoft.graph.user'
        $fixture.Mutations.Count | Should -Be 1
    }

    It 'RejectsManagedIdentityFirstPartyForeignAndUnverifiablePrincipal: <Case>' -ForEach @(
        @{ Case = 'managed identity'; Code = 'UnsupportedPrincipalType' },
        @{ Case = 'first party'; Code = 'PrincipalOwnershipMismatch' },
        @{ Case = 'foreign'; Code = 'PrincipalOwnershipMismatch' },
        @{ Case = 'unknown ownership'; Code = 'PrincipalOwnershipMismatch' }
    ) {
        switch ($Case) {
            'managed identity' { $fixture.EntraDeletedObjects[0].servicePrincipalType = 'ManagedIdentity' }
            'first party' { $fixture.EntraDeletedObjects[0].publisherName = 'Microsoft Services' }
            'foreign' { $fixture.EntraDeletedObjects[0].appOwnerOrganizationId = '99999999-9999-4999-8999-999999999999' }
            'unknown ownership' { $fixture.EntraDeletedObjects[0].Remove('appOwnerOrganizationId') }
        }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match $Code
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'AcknowledgementCannotComeFromSessionDefaults' {
        $parameters.Remove('AcknowledgePermanentDeletion')
        $fixture.DefaultParameterValues['*:Acknowledge*'] = $fixture.EntraServicePrincipal.id
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ConfirmationRequired'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RecoveryOrGenerationChangeStopsPurge: <Case>' -ForEach @(
        @{ Case = 'restored'; Restore = $true }, @{ Case = 'generation'; Restore = $false }
    ) {
        if ($Restore) { $fixture.GraphRestoreDeletedOnRead = 2 }
        else { $fixture.GraphChangeDeletedOnRead = 2 }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetChanged'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'PreservesARecreatedActivePrincipalWithADifferentObjectId' {
        $newPrincipal = $fixture.EntraServicePrincipal.Clone()
        $newPrincipal.id = 'cccccccc-1111-4111-8111-cccccccccccc'
        $fixture.OtherEntraServicePrincipals.Add($newPrincipal)
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.OtherEntraServicePrincipals.Count | Should -Be 1
        $fixture.Mutations[0].Id | Should -Be $fixture.EntraServicePrincipal.id
    }

    It 'AProperlyOwnedDeletedOrphanDoesNotRequireApplicationRecreation' {
        $fixture.EntraApplicationDeleted = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.EntraApplicationDeleted | Should -BeTrue
    }

    It 'AbsenceDenialAndPreviewRemainTruthful: <Case>' -ForEach @(
        @{ Case = 'absent' }, @{ Case = 'forbidden' }, @{ Case = 'WhatIf' }
    ) {
        switch ($Case) {
            'absent' { $fixture.EntraDeletedObjects.Clear() }
            'forbidden' { $fixture.GraphReadStatus = 403 }
            'WhatIf' { $parameters.WhatIf = $true; $parameters.Remove('Confirm'); $parameters.Remove('AcknowledgePermanentDeletion') }
        }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        if ($Case -eq 'forbidden') { $result.ErrorText | Should -Match 'GraphReadFailed'; $result.Output.Count | Should -Be 0 }
        else { $result.ErrorText | Should -BeNullOrEmpty; $result.Output[0].Status | Should -Be $(if ($Case -eq 'absent') { 'NoChange' } else { 'WouldChange' }) }
        $fixture.Mutations.Count | Should -Be 0
    }
}
