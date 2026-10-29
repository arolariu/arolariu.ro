BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Remove-EntraServicePrincipal.ps1'
}

Describe 'Remove-EntraServicePrincipal' {
    BeforeEach {
        $fixture = New-TaskFixture
        $parameters = @{
            TenantId = $fixture.Tenant; ServicePrincipalObjectId = $fixture.EntraServicePrincipal.id
            ExpectedApplicationClientId = $fixture.ApplicationClientId; NonInteractive = $true; Confirm = $false
        }
    }

    It 'VerifiesServicePrincipalRelationship' {
        $parameters.ExpectedApplicationClientId = '99999999-9999-4999-8999-999999999999'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ClientIdMismatch'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'PreservesApplicationRegistration' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $result.Output[0].ApplicationRegistrationState | Should -Be 'Preserved'
        $fixture.EntraServicePrincipalDeleted | Should -BeTrue
        $fixture.EntraApplicationDeleted | Should -BeFalse
        @($fixture.GraphRequests | Where-Object { $_.Method -eq 'DELETE' -and $_.Path -notlike '*/servicePrincipals/*' }).Count | Should -Be 0
    }

    It 'RejectsManagedIdentityAndForeignPrincipal: <Case>' -ForEach @(
        @{ Case = 'managed identity'; Code = 'UnsupportedPrincipalType' }, @{ Case = 'foreign'; Code = 'PrincipalOwnershipMismatch' }
    ) {
        if ($Case -eq 'managed identity') { $fixture.EntraServicePrincipal.servicePrincipalType = 'ManagedIdentity' }
        else { $fixture.EntraServicePrincipal.appOwnerOrganizationId = '99999999-9999-4999-8999-999999999999' }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match $Code
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'LocallyOwnedOrphanNeedsAuthoritativeMetadataAndExplicitClientId: <Case>' -ForEach @(
        @{ Case = 'known owner'; Owner = $true }, @{ Case = 'unknown owner'; Owner = $false }
    ) {
        $fixture.EntraApplicationDeleted = $true
        if (-not $Owner) { $fixture.EntraServicePrincipal.Remove('appOwnerOrganizationId') }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        if ($Owner) {
            $result.ErrorText | Should -BeNullOrEmpty
            $result.Output[0].ApplicationRegistrationState | Should -Be 'Absent'
            $fixture.EntraServicePrincipalDeleted | Should -BeTrue
        }
        else { $result.ErrorText | Should -Match 'PrincipalOwnershipMismatch'; $fixture.Mutations.Count | Should -Be 0 }
    }

    It 'DoesNotDeleteByFirstDisplayNameMatch' {
        $other = $fixture.EntraServicePrincipal.Clone()
        $other.id = 'cccccccc-1111-4111-8111-cccccccccccc'; $other.displayName = 'Task second'
        $fixture.OtherEntraServicePrincipals.Add($other)
        $parameters.Remove('ServicePrincipalObjectId'); $parameters.Remove('NonInteractive'); $parameters.Remove('Confirm')
        $parameters.Remove('ExpectedApplicationClientId'); $parameters.DisplayName = 'Task*'; $fixture.Inputs = @('0')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetSelectionDeclined'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'AlreadyAbsentIsNoChange' {
        $fixture.EntraServicePrincipalDeleted = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'ConcurrentPrincipalChangeStopsDelete' {
        $fixture.GraphChangePrincipalOnRead = 2
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'StateConflict'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'PreviewAndAbsentConsentCannotDelete: <Case>' -ForEach @(
        @{ Case = 'preview'; Preview = $true }, @{ Case = 'no consent'; Preview = $false }
    ) {
        $parameters.Remove('Confirm'); $parameters.WhatIf = $Preview
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        if ($Preview) { $result.ErrorText | Should -BeNullOrEmpty; $result.Output[0].Status | Should -Be 'WouldChange' }
        else { $result.ErrorText | Should -Match 'ConfirmationRequired' }
        $fixture.Mutations.Count | Should -Be 0
    }
}
