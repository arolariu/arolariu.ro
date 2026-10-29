BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Test-EasyAuthAccess.ps1'
}

Describe 'Test-EasyAuthAccess' {
    BeforeEach {
        $fixture = New-TaskFixture
        $parameters = @{
            TenantId = $fixture.Tenant; ExpectedPrincipalId = $fixture.PrincipalId
            ServiceUri = $fixture.ExpServiceUri; ExpectedApplicationClientId = $fixture.ApplicationClientId; ExpectedAccess = 'Allowed'
        }
    }

    It 'AllowedExistingActorReachesProtectedDiagnosticPath' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Verified'
        $result.Output[0].Checks.CurrentActorAccess | Should -Be 'Verified'
        $result.Output[0].Checks.WrongAudience | Should -Be 'NotVerified'
        $fixture.HttpRequests.Count | Should -Be 3
        $fixture.HttpRequests[-1].Uri | Should -Match '/__arolariu-auth-probe-[0-9a-f]{32}$'
    }

    It 'UnauthenticatedRequestIsRejected' {
        $fixture.EasyAuthAnonymousStatus = 200
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'AuthEnforcementMissing'
        $result.Output.Count | Should -Be 0
    }

    It 'WrongAudienceIsClaimedTestedOnlyWithSuitableToken' {
        $parameters.WrongAudienceToken = New-SignedWrongAudienceToken $fixture
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Checks.WrongAudience | Should -Be 'Verified'
        $fixture.HttpRequests.Count | Should -Be 5
        @($fixture.Calls | Where-Object Name -eq 'Get-AzAccessToken').Count | Should -Be 1
    }

    It 'AnUnsignedOrInvalidSignatureIsNotAudienceProof: <Case>' -ForEach @(
        @{ Case = 'unsigned'; Unsigned = $true }, @{ Case = 'invalid signature'; Unsigned = $false }
    ) {
        $parameters.WrongAudienceToken = if ($Unsigned) { New-TestAccessToken -Fixture $fixture -ResourceUrl 'https://management.azure.com/' }
            else { New-SignedWrongAudienceToken $fixture -BadSignature }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Checks.WrongAudience | Should -Be 'NotVerified'
        @($fixture.HttpRequests | Where-Object { $_.Uri -match '/__arolariu-auth-probe-' }).Count | Should -Be 2
    }

    It 'ExpiredNegativeTokenIsNotAudienceProof' {
        $parameters.WrongAudienceToken = New-SignedWrongAudienceToken $fixture -Expired
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Checks.WrongAudience | Should -Be 'NotVerified'
    }

    It 'AServiceThatAdmitsTheWrongAudienceFails' {
        $parameters.WrongAudienceToken = New-SignedWrongAudienceToken $fixture
        $fixture.EasyAuthWrongAudienceStatus = 404
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'AuthOutcomeMismatch'
        $result.Output.Count | Should -Be 0
    }

    It 'DeniedActorMustBeTheActualExistingContext' {
        $fixture.EasyAuthAllowedPrincipalIds = @('99999999-9999-4999-8999-999999999999')
        $parameters.ExpectedAccess = 'Denied'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Checks.CurrentActorAccess | Should -Be 'Verified'
        $parameters.ExpectedPrincipalId = '99999999-9999-4999-8999-999999999999'
        $mismatch = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $mismatch.ErrorText | Should -Match 'ActorMismatch'
    }

    It 'TokenAcquisitionFailureIsNotServiceDenialProof' {
        $fixture.TokenReadStatus = 403
        $parameters.ExpectedAccess = 'Denied'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TokenUnavailable'
        $result.Output.Count | Should -Be 0
        $fixture.HttpRequests.Count | Should -Be 0
    }

    It 'ExcludedOrUnreadyPathCannotProveAuth: <Case>' -ForEach @(
        @{ Case = 'unready'; Ready = 503; Anonymous = 401; Code = 'ApplicationNotReady' },
        @{ Case = 'excluded'; Ready = 200; Anonymous = 404; Code = 'AuthEnforcementMissing' }
    ) {
        $fixture.EasyAuthReadyStatus = $Ready; $fixture.EasyAuthAnonymousStatus = $Anonymous
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match $Code
        $result.Output.Count | Should -Be 0
    }

    It 'NeverFollowsRedirectOrReadsSecretBody' {
        $fixture.EasyAuthAllowedStatus = 302
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'AuthOutcomeMismatch'
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY|test-only-account'
        $result.AllText | Should -Not -Match ([regex]::Escape($fixture.LastToken))
        @($fixture.HttpRequests | Where-Object MaximumRedirection -ne 0).Count | Should -Be 0
        $fixture.HttpRequests.Uri -join ',' | Should -Not -Match '/admin|/config|run-time|build-time'
    }

    It 'RejectsUnsafeTargetsBeforeCredentials: <Uri>' -ForEach @(
        @{ Uri = 'http://task-exp.azurewebsites.net/' }, @{ Uri = 'https://unrelated.example.invalid/' },
        @{ Uri = 'https://task-exp.azurewebsites.net/?secret=x' }
    ) {
        $parameters.ServiceUri = $Uri
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetEndpoint'
        @($fixture.Calls | Where-Object Name -eq 'Get-AzAccessToken').Count | Should -Be 0
    }

    It 'WhatIfDoesNotProbeOrGrant' {
        $parameters.WhatIf = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldRun'
        $fixture.HttpRequests.Count | Should -Be 0
        $fixture.AccessMutations.Count | Should -Be 0
        @($fixture.Calls | Where-Object Name -eq 'Get-AzAccessToken').Count | Should -Be 0
    }
}
