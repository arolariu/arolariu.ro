BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Ensure-SqlRoleMembership.ps1'
}

Describe 'Ensure-SqlRoleMembership' {
    BeforeEach {
        $fixture = New-TaskFixture
        $fixture.Principals.Add([pscustomobject]@{ Name = 'backend'; Type = 'E'; Sid = '0x11111111111111418111111111111111' })
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.DatabaseId
            UserName = 'backend'; RoleName = 'db_datareader'; NonInteractive = $true; Confirm = $false
        }
    }

    It 'ExistingMembershipIsNoChange' {
        $fixture.Memberships.Add([pscustomobject]@{ User = 'backend'; Role = 'db_datareader' })
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output.Count | Should -Be 1
        $result.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'AddsExactlyOneRequestedMembershipAndPreservesOtherMemberships' {
        $fixture.Memberships.Add([pscustomobject]@{ User = 'backend'; Role = 'db_datawriter' })
        $fixture.Memberships.Add([pscustomobject]@{ User = 'other'; Role = 'db_datareader' })
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $second = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -BeNullOrEmpty
        $second.ErrorText | Should -BeNullOrEmpty
        $first.Output[0].Status | Should -Be 'Changed'
        $second.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 1
        $fixture.Memberships.Count | Should -Be 3
        $fixture.Memberships[0].Role | Should -Be 'db_datawriter'
        $fixture.Memberships[1].User | Should -Be 'other'
        $fixture.Mutations[0].Arguments.Query | Should -Be 'ALTER ROLE [db_datareader] ADD MEMBER [backend];'
        $first.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'RejectsMissingUserOrRole: <Case>' -ForEach @(
        @{ Case = 'user'; User = $false }, @{ Case = 'role'; User = $true }
    ) {
        if ($User) { $fixture.Roles = @('db_datawriter') }
        else { $fixture.Principals.Clear() }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'PrincipalMissing'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RejectsDbOwnerAndCustomRoles: <Role>' -ForEach @(
        @{ Role = 'db_owner' }, @{ Role = 'application_admin' }
    ) {
        $parameters.RoleName = $Role
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'RoleName'
        @($fixture.Calls | Where-Object Name -eq 'Invoke-Sqlcmd').Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RefusesRoleNestingInsteadOfTreatingARoleAsAUser' {
        $fixture.Principals[0].Type = 'R'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'PrincipalConflict'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RechecksConcurrentMembership: <Case>' -ForEach @(
        @{ Case = 'before write'; Read = 2; Race = $false },
        @{ Case = 'write conflict'; Read = 0; Race = $true }
    ) {
        $fixture.SqlAppearsOnRead = $Read
        $fixture.SqlRoleRace = $Race
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'SafelyQuotesHostileIdentifiersAndUsesTheEncryptedExplicitConnection' {
        $parameters.UserName = 'operator]'';$(token)'
        $fixture.Principals[0].Name = $parameters.UserName
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.Mutations[0].Arguments.Query | Should -BeExactly 'ALTER ROLE [db_datareader] ADD MEMBER [operator]]'';$(token)];'
        $fixture.Memberships[0].User | Should -BeExactly 'operator]'';$(token)'
        $call = $fixture.Mutations[0].Arguments
        $call.Database | Should -Be 'invoices'
        $call.ServerInstance | Should -Be 'task-sql.database.windows.net'
        $call.AccessToken | Should -BeOfType ([securestring])
        $call.Encrypt | Should -Be 'Mandatory'
        [bool] $call.TrustServerCertificate | Should -BeFalse
        $call.DisableVariables | Should -BeTrue
        $call.DisableCommands | Should -BeTrue
    }

    It 'SupportsExactNoninteractiveNameLookup' {
        $parameters.Remove('TargetResourceId')
        $parameters.ResourceGroupName = 'task-tests'
        $parameters.ServerName = 'task-sql'
        $parameters.DatabaseName = 'invoices'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].TargetResourceId | Should -Be $fixture.DatabaseId
        $result.Output[0].Status | Should -Be 'Changed'
        $result.Prompts | Should -Be 0
    }

    It 'DeclineAndWhatIfDoNotWrite: <Case>' -ForEach @(
        @{ Case = 'manual explicit bypass still prompts'; Manual = $true; Preview = $false; Expected = 'Declined' },
        @{ Case = 'noninteractive WhatIf'; Manual = $false; Preview = $true; Expected = 'WouldChange' }
    ) {
        if (-not $Manual) { $parameters.Remove('Confirm') }
        $parameters.NonInteractive = -not $Manual
        $parameters.WhatIf = $Preview
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be $Expected
        $fixture.Mutations.Count | Should -Be 0
        if ($Manual) { $result.Prompts | Should -Be 1 }
        else { $result.Prompts | Should -Be 0 }
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
        @($fixture.Calls | Where-Object Name -eq 'Invoke-Sqlcmd').Count | Should -Be 0
    }

    It 'RejectsAmbiguousNoninteractiveScope' {
        $parameters.Remove('TargetResourceId')
        $parameters.ResourceGroupName = 'task-tests'
        $parameters.ServerName = 'task-sql'
        $parameters.DatabaseName = '*'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'AmbiguousTarget'
        $fixture.Mutations.Count | Should -Be 0
        $result.Prompts | Should -Be 0
    }

    It 'RedactsSqlFailureWithoutClaimingMembership' {
        $fixture.SqlWriteStatus = 403
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SqlWriteFailed'
        $result.Output.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }
}
