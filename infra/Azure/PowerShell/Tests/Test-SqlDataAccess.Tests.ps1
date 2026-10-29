BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Test-SqlDataAccess.ps1'
}

Describe 'Test-SqlDataAccess' {
    BeforeEach {
        $fixture = New-TaskFixture
        $fixture.ActorKind = 'Application'
        $fixture.Context.Account.Type = 'ServicePrincipal'
        $fixture.ClientId = '00112233-4455-6677-8899-aabbccddeeff'
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription
            ExpectedPrincipalId = $fixture.PrincipalId; ExpectedClientId = $fixture.ClientId
            DatabaseResourceId = $fixture.DatabaseId; ServerFqdn = 'task-sql.database.windows.net'
            DatabaseName = 'invoices'; UserName = 'backend'
        }
    }

    It 'ConnectsAsExactExpectedApplication' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Verified'
        $result.Output[0].ActualPrincipalId | Should -Be $fixture.PrincipalId
        $result.Output[0].Checks.PrincipalSid | Should -Be 'Verified'
        $result.Output[0].Checks.Schema | Should -Be 'NotVerified'
        $calls = @($fixture.Calls | Where-Object Name -eq 'Invoke-Sqlcmd')
        foreach ($call in $calls) {
            $call.Arguments.AccessToken | Should -BeOfType ([securestring])
            $call.Arguments.Database | Should -Be 'invoices'
            $call.Arguments.Encrypt | Should -Be 'Mandatory'
            [bool] $call.Arguments.TrustServerCertificate | Should -BeFalse
            $call.Arguments.ConnectionTimeout | Should -Be 15
            $call.Arguments.QueryTimeout | Should -Be 30
            $call.Arguments.DisableVariables | Should -BeTrue
            $call.Arguments.DisableCommands | Should -BeTrue
        }
    }

    It 'RejectsPrincipalIdAsClientSid' {
        $fixture.SqlProbeSid = '0x44444444444444448444444444444444'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SidMismatch'
        $result.Output.Count | Should -Be 0
    }

    It 'ChecksEffectiveReadWritePermissionsWithoutBusinessWrites' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Checks.ReadWritePermissions | Should -Be 'Verified'
        $fixture.Mutations.Count | Should -Be 0
        $queries = @($fixture.Calls | Where-Object Name -eq 'Invoke-Sqlcmd')
        @($queries | Where-Object { $_.Arguments.Query -notmatch '^\s*SELECT' }).Count | Should -Be 0
    }

    It 'MissingEffectivePermissionFails: <Permission>' -ForEach @(
        @{ Permission = 'CanSelect' }, @{ Permission = 'CanInsert' }, @{ Permission = 'CanUpdate' }, @{ Permission = 'CanDelete' }
    ) {
        $fixture.SqlProbePermissions[$Permission] = 0
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SqlPermissionDenied'
        $result.Output.Count | Should -Be 0
    }

    It 'MissingRequiredTableFailsSeparatelyFromLogin' {
        $parameters.RequiredTables = @('dbo.AspNetUsers', 'dbo.NotCreated')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SchemaMissing'
        $result.Output.Count | Should -Be 0
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'VerifiesNamedTablesAndTheirEffectivePermissionsWithoutCreatingThem' {
        $parameters.RequiredTables = @('dbo.AspNetUsers', 'dbo.AspNetRoles')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Checks.Schema | Should -Be 'Verified'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'AnObjectLevelDenyIsNotHiddenByDatabasePermissions' {
        $parameters.RequiredTables = @('dbo.AspNetUsers')
        $fixture.SqlObjectDenied = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SqlPermissionDenied'
        $result.Output.Count | Should -Be 0
    }

    It 'DoesNotGrantAdminFirewallOrRoles' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.AccessMutations.Count | Should -Be 0
        @($fixture.Calls | Where-Object Name -match 'RoleAssignment|Firewall|Invoke-AzRestMethod|Get-AzResource').Count | Should -Be 0
    }

    It 'RejectsUnsafeConnectionInputs: <Case>' -ForEach @(
        @{ Case = 'host'; HostName = 'other.example.invalid'; Database = 'invoices' },
        @{ Case = 'connection string'; HostName = 'task-sql.database.windows.net;TrustServerCertificate=True'; Database = 'invoices' },
        @{ Case = 'database mismatch'; HostName = 'task-sql.database.windows.net'; Database = 'master' }
    ) {
        $parameters.ServerFqdn = $HostName; $parameters.DatabaseName = $Database
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetScope|TargetEndpoint'
        @($fixture.Calls | Where-Object Name -eq 'Invoke-Sqlcmd').Count | Should -Be 0
    }

    It 'RejectsWrongActorBeforeConnecting' {
        $parameters.ExpectedPrincipalId = '99999999-9999-4999-8999-999999999999'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ActorMismatch'
        @($fixture.Calls | Where-Object Name -eq 'Invoke-Sqlcmd').Count | Should -Be 0
    }

    It 'RedactsLoginErrors' {
        $fixture.SqlRequireAdministrator = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SqlLoginFailed'
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY|test-only-account'
        $result.AllText | Should -Not -Match ([regex]::Escape($fixture.LastToken))
        $fixture.AccessMutations.Count | Should -Be 0
    }

    It 'WhatIfDoesNotConnect' {
        $parameters.WhatIf = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldRun'
        @($fixture.Calls | Where-Object Name -in 'Invoke-Sqlcmd', 'Get-AzAccessToken').Count | Should -Be 0
        $fixture.AccessMutations.Count | Should -Be 0
    }
}
