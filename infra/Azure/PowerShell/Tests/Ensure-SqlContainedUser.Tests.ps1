BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Ensure-SqlContainedUser.ps1'
}

Describe 'SQL temporary access: <TaskName>' -ForEach @(
    @{ TaskName = 'Ensure-SqlContainedUser' }, @{ TaskName = 'Ensure-SqlRoleMembership' }
) {
    BeforeEach {
        $fixture = New-TaskFixture
        $fixture.SqlRequireAdministrator = $true
        $receiptPath = Join-Path $TestDrive "$([guid]::NewGuid()).json"
        $fixture.ExpectedReceiptPath = $receiptPath
        $taskPath = Join-Path (Split-Path $PSScriptRoot) "$TaskName.ps1"
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.DatabaseId
            UserName = 'backend'; ManageTemporaryAccess = $true; RecoveryReceiptPath = $receiptPath
            OperatorLoginName = 'test-only-operator'; NonInteractive = $true; Confirm = $false
        }
        if ($TaskName -eq 'Ensure-SqlContainedUser') { $parameters.ExpectedSid = '0x11111111111111418111111111111111' }
        else {
            $parameters.RoleName = 'db_datareader'
            $fixture.Principals.Add([pscustomobject]@{ Name = 'backend'; Type = 'E'; Sid = '0x11111111111111418111111111111111' })
        }
    }

    It 'ExistingSqlAuthorityNeedsNoLease' {
        $fixture.SqlRequireAdministrator = $false
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $result.Output[0].AccessChanged | Should -BeFalse
        $result.Output[0].CleanupStatus | Should -Be 'NotNeeded'
        $fixture.AccessMutations.Count | Should -Be 0
    }

    It 'RestoresExactPriorAdministratorAndEntraOnlyState' {
        $prior = $fixture.SqlAdministrator.PSObject.Copy()
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].CleanupStatus | Should -Be 'Completed'
        $result.Output[0].AccessChanged | Should -BeTrue
        $fixture.SqlAdministrator.ObjectId | Should -Be $prior.ObjectId
        $fixture.SqlAdministrator.PrincipalType | Should -Be 'Application'
        $fixture.SqlAdministrator.Login | Should -Be $prior.Login
        $fixture.SqlEntraOnly | Should -BeTrue
        $fixture.SqlAdministratorPatches.Count | Should -Be 2
        $fixture.SqlAccessReceiptPhases[0] | Should -Match 'Prepared'
    }

    It 'CreatesOnlyExactOwnedIpv4RuleWhenNeeded' {
        $fixture.SqlRequireFirewall = $true
        $fixture.SqlFirewallRules.Add([pscustomobject]@{
            FirewallRuleName = 'unrelated'; StartIpAddress = '203.0.113.99'; EndIpAddress = '203.0.113.99'
        })
        $parameters.ClientIPAddress = '203.0.113.17'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $add = @($fixture.Calls | Where-Object Name -eq 'New-AzSqlServerFirewallRule')
        $add.Count | Should -Be 1
        $add[0].Arguments.StartIpAddress | Should -Be '203.0.113.17'
        $add[0].Arguments.EndIpAddress | Should -Be '203.0.113.17'
        $fixture.SqlFirewallRules.Count | Should -Be 1
        $fixture.SqlFirewallRules[0].FirewallRuleName | Should -Be 'unrelated'
    }

    It 'FailureRestoresAdminBeforeDroppingOwnedAccess' {
        $fixture.SqlRequireFirewall = $true
        $fixture.SqlWriteStatus = 500
        $parameters.ClientIPAddress = '203.0.113.17'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SqlWriteFailed'
        $result.Output.Count | Should -Be 0
        ($fixture.AccessMutations.Name -join ',') | Should -Be 'AddSqlFirewall,SetSqlAdministrator,RestoreSqlAdministrator,RemoveSqlFirewall'
        $fixture.SqlAdministrator.PrincipalType | Should -Be 'Application'
        $fixture.SqlFirewallRules.Count | Should -Be 0
    }

    It 'ConcurrentAdminChangeIsNotOverwritten' {
        $fixture.SqlConcurrentAdministratorChange = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'CleanupFailed'
        $result.Output.Count | Should -Be 0
        $fixture.SqlAdministrator.ObjectId | Should -Be '99999999-9999-4999-8999-999999999999'
        @($fixture.AccessMutations | Where-Object Name -eq 'RestoreSqlAdministrator').Count | Should -Be 0
    }

    It 'UnknownPriorAdminRefusesSwap' {
        $fixture.SqlAdministratorUnknown = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SqlAdministratorUnknown'
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'ResumeCleanupNeverCreatesUserOrMembership' {
        $fixture.SqlRestoreStatus = 500
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -Match 'CleanupFailed'
        $first.Output.Count | Should -Be 0
        $reads = $fixture.SqlReads
        $fixture.SqlRestoreStatus = 0
        $fixture.Resources = @($fixture.Resources | Where-Object ResourceId -ne $fixture.DatabaseId)
        $result = Invoke-TaskUnderTest $taskPath @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.DatabaseId
            ResumeCleanup = $true; RecoveryReceiptPath = $receiptPath; NonInteractive = $true; Confirm = $false
        } $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Changed | Should -BeFalse
        $fixture.Mutations.Count | Should -Be 1
        $fixture.SqlReads | Should -Be $reads
        $fixture.SqlAdministrator.PrincipalType | Should -Be 'Application'
    }

    It 'CleansAnAdministratorPatchThatFailedAfterApplying' {
        $fixture.SqlPatchFailsAfterChange = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SqlAccessSetupFailed'
        $fixture.SqlAdministrator.PrincipalType | Should -Be 'Application'
        $fixture.Mutations.Count | Should -Be 0
        (Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json).Cleanup.Status | Should -Be 'Completed'
    }

    It 'PartialCleanupRecoveryIsIdempotentAfterTheFirewallWasAlreadyRemoved' {
        $fixture.SqlRequireFirewall = $true
        $parameters.ClientIPAddress = '203.0.113.17'
        $fixture.SqlRestoreStatus = 500
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -Match 'CleanupFailed'
        $fixture.SqlFirewallRules.Count | Should -Be 0
        $fixture.SqlRestoreStatus = 0
        $recovery = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.DatabaseId
            ResumeCleanup = $true; RecoveryReceiptPath = $receiptPath; NonInteractive = $true; Confirm = $false
        }
        $second = Invoke-TaskUnderTest $taskPath $recovery $fixture
        $third = Invoke-TaskUnderTest $taskPath $recovery $fixture
        $second.ErrorText | Should -BeNullOrEmpty
        $third.ErrorText | Should -BeNullOrEmpty
        $second.Output[0].CleanupStatus | Should -Be 'Completed'
        $third.Output[0].AccessChanged | Should -BeFalse
        $fixture.SqlAdministrator.PrincipalType | Should -Be 'Application'
        $fixture.Mutations.Count | Should -Be 1
    }

    It 'WhatIfDefersProtectedSqlStateWithoutAccessWrites' {
        $parameters.Remove('Confirm')
        $parameters.WhatIf = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldChange'
        $result.Output[0].TargetStateKnown | Should -BeFalse
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
        Test-Path -LiteralPath $receiptPath | Should -BeFalse
    }

    It 'ReceiptAndDiagnosticsContainOnlySafeMetadata' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        (Get-Content -LiteralPath $receiptPath -Raw) | Should -Not -Match 'SENSITIVE-PROVIDER-BODY|test-only-account|eyJ'
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY|test-only-account'
        $result.AllText | Should -Match ([regex]::Escape($fixture.PrincipalId))
    }

    It 'WhatIfDoesNotMistakeCatalogInvisibilityForAnAbsentTarget' {
        $fixture.SqlRequireAdministrator = $false
        $fixture.SqlCanInspect = $false
        $fixture.SqlCanManage = $false
        $parameters.WhatIf = $true
        $parameters.Remove('Confirm')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldChange'
        $result.Output[0].TargetStateKnown | Should -BeFalse
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'DefaultsCannotAuthorizeSqlAccessManagement' {
        $parameters.Remove('ManageTemporaryAccess')
        $fixture.DefaultParameterValues['*:ManageTemp*'] = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ConfirmationRequired'
        $fixture.AccessMutations.Count | Should -Be 0
    }

    It 'RejectsNonExactIpv4AccessRules: <Address>' -ForEach @(
        @{ Address = '::1' }, @{ Address = '0.0.0.0' }
    ) {
        $parameters.ClientIPAddress = $Address
        $fixture.SqlRequireFirewall = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'InvalidClientIPAddress'
        $fixture.AccessMutations.Count | Should -Be 0
    }
}

Describe 'Ensure-SqlContainedUser' {
    BeforeEach {
        $fixture = New-TaskFixture
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.DatabaseId
            UserName = 'backend'; ExpectedSid = '0x11111111111111418111111111111111'; NonInteractive = $true; Confirm = $false
        }
    }

    It 'MatchingNameSidAndTypeIsNoChange' {
        $fixture.Principals.Add([pscustomobject]@{ Name = 'backend'; Type = 'E'; Sid = '0x11111111111111418111111111111111' })
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output.Count | Should -Be 1
        $result.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'CreatesOneMissingExternalUserAndPreservesOtherPrincipals' {
        $fixture.Principals.Add([pscustomobject]@{ Name = 'other'; Type = 'E'; Sid = '0x22222222222222428222222222222222' })
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $second = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -BeNullOrEmpty
        $second.ErrorText | Should -BeNullOrEmpty
        $first.Output[0].Status | Should -Be 'Changed'
        $second.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 1
        $fixture.Principals.Count | Should -Be 2
        $fixture.Principals[0].Sid | Should -Be '0x22222222222222428222222222222222'
        $fixture.Principals[1].Name | Should -Be 'backend'
        $fixture.Principals[1].Type | Should -Be 'E'
        $first.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'RejectsConflictingSidOrType: <Case>' -ForEach @(
        @{ Case = 'SID'; Sid = '0x22222222222222428222222222222222'; Type = 'E' },
        @{ Case = 'type'; Sid = '0x11111111111111418111111111111111'; Type = 'S' }
    ) {
        $fixture.Principals.Add([pscustomobject]@{ Name = 'backend'; Type = $Type; Sid = $Sid })
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'PrincipalConflict'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RejectsSidBoundToAnotherUser' {
        $fixture.Principals.Add([pscustomobject]@{ Name = 'someone-else'; Type = 'E'; Sid = '0x11111111111111418111111111111111' })
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'PrincipalConflict'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'SafelyQuotesHostileIdentifiersAndDisablesSqlcmdExpansion' {
        $parameters.UserName = 'operator]'';$(token)'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.Principals[0].Name | Should -BeExactly 'operator]'';$(token)'
        $fixture.Mutations[0].Arguments.Query | Should -BeExactly 'CREATE USER [operator]]'';$(token)] WITH SID = 0x11111111111111418111111111111111, TYPE = E;'
        $read = @($fixture.Calls | Where-Object Name -eq 'Invoke-Sqlcmd')[0]
        $read.Arguments.Query | Should -Match ([regex]::Escape('WHERE name = N''operator]'''';$(token)'' OR sid = 0x11111111111111418111111111111111;'))
        $read.Arguments.DisableVariables | Should -BeTrue
        $read.Arguments.DisableCommands | Should -BeTrue
    }

    It 'RejectsMalformedSidBeforeQuery: <Sid>' -ForEach @(
        @{ Sid = '0x1234' }, @{ Sid = '0x11111111111111418111111111111111; DROP USER other' }
    ) {
        $parameters.ExpectedSid = $Sid
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'InvalidInput'
        @($fixture.Calls | Where-Object Name -eq 'Invoke-Sqlcmd').Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'UsesExplicitDatabaseAndSafeToken' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $calls = @($fixture.Calls | Where-Object Name -eq 'Invoke-Sqlcmd')
        foreach ($call in $calls) {
            $call.Arguments.ServerInstance | Should -Be 'task-sql.database.windows.net'
            $call.Arguments.Database | Should -Be 'invoices'
            $call.Arguments.AccessToken | Should -BeOfType ([securestring])
            $call.Arguments.Encrypt | Should -Be 'Mandatory'
            [bool] $call.Arguments.TrustServerCertificate | Should -BeFalse
            $call.Arguments.HostNameInCertificate | Should -Be 'task-sql.database.windows.net'
            $call.Arguments.ConnectionTimeout | Should -Be 15
            $call.Arguments.QueryTimeout | Should -Be 30
            $call.Arguments.AbortOnError | Should -BeTrue
        }
        $tokenCall = @($fixture.Calls | Where-Object Name -eq 'Get-AzAccessToken')[0]
        $tokenCall.Arguments.ResourceUrl | Should -Be 'https://database.windows.net/'
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'RechecksAConcurrentMatchingUserWithoutRepeatingCreation: <Case>' -ForEach @(
        @{ Case = 'before write'; Read = 2; Race = $false },
        @{ Case = 'create conflict'; Read = 0; Race = $true }
    ) {
        $fixture.SqlAppearsOnRead = $Read
        $fixture.SqlCreateRace = $Race
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'NoChange'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'DeclineAndWhatIfDoNotWrite: <Case>' -ForEach @(
        @{ Case = 'decline'; Manual = $true; Preview = $false; Expected = 'Declined' },
        @{ Case = 'WhatIf'; Manual = $false; Preview = $true; Expected = 'WouldChange' }
    ) {
        $parameters.Remove('Confirm')
        $parameters.NonInteractive = -not $Manual
        $parameters.WhatIf = $Preview
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be $Expected
        $fixture.Mutations.Count | Should -Be 0
        if (-not $Manual) { $result.Prompts | Should -Be 0 }
    }

    It 'RejectsMissingAutomationConsent' {
        $parameters.Remove('Confirm')
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ConfirmationRequired'
        $result.Prompts | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RejectsContextMismatch' {
        $fixture.Context.Tenant.Id = '33333333-3333-4333-8333-333333333333'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ContextMismatch'
        @($fixture.Calls | Where-Object Name -eq 'Invoke-Sqlcmd').Count | Should -Be 0
    }

    It 'RejectsAmbiguousNoninteractiveScope' {
        $parameters.Remove('TargetResourceId')
        $parameters.ResourceGroupName = 'task-tests'
        $parameters.ServerName = 'task-*'
        $parameters.DatabaseName = 'invoices'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'AmbiguousTarget'
        $fixture.Mutations.Count | Should -Be 0
        $result.Prompts | Should -Be 0
    }

    It 'RedactsSqlAndTokenFailures: <Case>' -ForEach @(
        @{ Case = 'metadata'; Read = 403; Write = 0; Token = 0; Code = 'SqlReadFailed' },
        @{ Case = 'creation'; Read = 0; Write = 500; Token = 0; Code = 'SqlWriteFailed' },
        @{ Case = 'token'; Read = 0; Write = 0; Token = 403; Code = 'TokenUnavailable' }
    ) {
        $fixture.SqlReadStatus = $Read
        $fixture.SqlWriteStatus = $Write
        $fixture.TokenReadStatus = $Token
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match $Code
        $result.Output.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }
}
