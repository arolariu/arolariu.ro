BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Remove-EntraApplication.ps1'
}

Describe 'Remove-EntraApplication' {
    BeforeEach {
        $fixture = New-TaskFixture
        $parameters = @{
            TenantId = $fixture.Tenant; ApplicationObjectId = $fixture.EntraApplication.id
            ExpectedApplicationClientId = $fixture.ApplicationClientId; NonInteractive = $true; Confirm = $false
        }
    }

    It 'DiscoversTenantAppsWithoutSecretCollections' {
        $parameters.Remove('ApplicationObjectId'); $parameters.Remove('NonInteractive'); $parameters.Remove('Confirm')
        $parameters.Remove('ExpectedApplicationClientId'); $parameters.DisplayName = 'Task*'; $parameters.WhatIf = $true
        $fixture.Inputs = @('1')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldChange'
        $fixture.GraphRequests.Path -join ',' | Should -Not -Match 'passwordCredentials|keyCredentials'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'VerifiesExpectedClientIdAndObjectId' {
        $parameters.ExpectedApplicationClientId = '99999999-9999-4999-8999-999999999999'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ClientIdMismatch'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'AmbiguousNameCannotDelete' {
        $other = $fixture.EntraApplication.Clone()
        $other.id = 'cccccccc-1111-4111-8111-cccccccccccc'; $other.displayName = 'Task second'
        $other.appId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
        $fixture.OtherEntraApplications.Add($other)
        $parameters.Remove('ApplicationObjectId'); $parameters.Remove('NonInteractive'); $parameters.Remove('Confirm')
        $parameters.Remove('ExpectedApplicationClientId'); $parameters.DisplayName = 'Task*'; $fixture.Inputs = @('0')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetSelectionDeclined'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'ForeignFirstPartyOrUnexpectedTypeIsRejected: <Case>' -ForEach @(
        @{ Case = 'multitenant' }, @{ Case = 'first party' }, @{ Case = 'different object type' }
    ) {
        switch ($Case) {
            'multitenant' { $fixture.EntraApplication.signInAudience = 'AzureADMultipleOrgs' }
            'first party' { $fixture.EntraApplication.publisherDomain = 'microsoft.com' }
            'different object type' { $fixture.EntraApplication['@odata.type'] = '#microsoft.graph.servicePrincipal' }
        }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ApplicationOwnershipMismatch|UnexpectedObjectType'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'DeleteIsNotPermanentPurge' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.EntraApplicationDeleted | Should -BeTrue
        @($fixture.GraphRequests | Where-Object { $_.Method -eq 'DELETE' -and $_.Path -like '*/directory/deletedItems/*' }).Count | Should -Be 0
        @($fixture.EntraDeletedObjects | Where-Object id -eq $fixture.EntraApplication.id).Count | Should -Be 1
    }

    It 'LinkedServicePrincipalEffectsAreReported' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].LinkedServicePrincipalObjectId | Should -Be $fixture.EntraServicePrincipal.id
        $result.Output[0].LinkedServicePrincipalState | Should -Be 'Absent'
        @($fixture.GraphRequests | Where-Object { $_.Method -eq 'DELETE' -and $_.Path -like '*/servicePrincipals/*' }).Count | Should -Be 0
    }

    It 'DoesNotPretendAnUnchangedLinkedPrincipalWasDeleted' {
        $fixture.EntraAutoDeleteLinkedSp = $false
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].LinkedServicePrincipalState | Should -Be 'Active'
        $fixture.EntraServicePrincipalDeleted | Should -BeFalse
    }

    It 'ConcurrentApplicationChangeStopsDelete' {
        $fixture.GraphChangeApplicationOnRead = 2
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'StateConflict'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'ForbiddenGraphMutationDoesNotGrantConsentOrLeakErrors' {
        $fixture.GraphWriteStatus = 403
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'DirectoryAuthorityRequired'
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY|test-only-account'
    }

    It 'SessionDefaultsCannotAuthorizeDirectoryDeletion' {
        $parameters.Remove('Confirm'); $fixture.DefaultParameterValues['*:cf'] = $false
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ConfirmationRequired'
        $fixture.Mutations.Count | Should -Be 0
    }
}
