BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Test-EasyAuthConfiguration.ps1'
}

Describe 'Test-EasyAuthConfiguration' {
    BeforeEach {
        $fixture = New-TaskFixture
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; SiteResourceId = $fixture.ExpSiteId
            ExpectedApplicationClientId = $fixture.ApplicationClientId; ExpectedCallerPrincipalIds = @($fixture.PrincipalId)
        }
    }

    It 'VerifiesRegistrationIssuerAndObjectIdAllowlist' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Verified'
        $result.Output[0].Checks.Registration | Should -Be 'Verified'
        $result.Output[0].Checks.CallerObjectIds | Should -Be 'Verified'
        $result.Output[0].Checks.RuntimeAccess | Should -Be 'NotVerified'
        $fixture.GraphRequests.Count | Should -Be 2
    }

    It 'RejectsWrongTenantOrClientId: <Case>' -ForEach @(
        @{ Case = 'issuer'; Issuer = $true }, @{ Case = 'client ID'; Issuer = $false }
    ) {
        $registration = $fixture.AuthSettings.identityProviders.azureActiveDirectory.registration
        if ($Issuer) { $registration.openIdIssuer = 'https://login.microsoftonline.com/99999999-9999-4999-8999-999999999999/v2.0' }
        else { $registration.clientId = '99999999-9999-4999-8999-999999999999' }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'EasyAuthMismatch|TenantIssuerMismatch'
        $result.Output.Count | Should -Be 0
    }

    It 'DistinguishesImplicitV2AudienceFromConfiguredAudience' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Checks.ImplicitClientIdAudience | Should -Be 'Verified'
        $result.Output[0].Checks.ConfiguredApiUriAudience | Should -Be 'NotVerified'
        $fixture.AuthSettings.identityProviders.azureActiveDirectory.validation.allowedAudiences = @("api://$($fixture.ApplicationClientId)")
        $configured = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $configured.ErrorText | Should -BeNullOrEmpty
        $configured.Output[0].Checks.ConfiguredApiUriAudience | Should -Be 'Verified'
    }

    It 'ReportsUnsafeAdminExclusions: <Path>' -ForEach @(
        @{ Path = '/admin' }, @{ Path = '/admin/*' }, @{ Path = '/*' }
    ) {
        $fixture.AuthSettings.globalValidation.excludedPaths += $Path
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'UnsafeAuthExclusion'
        $result.Output.Count | Should -Be 0
        $fixture.AccessMutations.Count | Should -Be 0
    }

    It 'RejectsWrongObjectIdAllowlistWithoutTreatingClientIdsAsPrincipalIds' {
        $fixture.AuthSettings.identityProviders.azureActiveDirectory.validation.defaultAuthorizationPolicy.allowedPrincipals.identities = @($fixture.ClientId)
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'CallerAllowlistMismatch'
        $result.Output.Count | Should -Be 0
    }

    It 'RejectsDisabledOrNonV2Registration' {
        $fixture.EntraApplication.api.requestedAccessTokenVersion = 1
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ApplicationRegistrationMismatch'
        $result.Output.Count | Should -Be 0
    }

    It 'RejectsForeignOrManagedIdentityServicePrincipal: <Case>' -ForEach @(
        @{ Case = 'managed identity'; Foreign = $false }, @{ Case = 'foreign owner'; Foreign = $true }
    ) {
        if ($Foreign) { $fixture.EntraServicePrincipal.appOwnerOrganizationId = '99999999-9999-4999-8999-999999999999' }
        else { $fixture.EntraServicePrincipal.servicePrincipalType = 'ManagedIdentity' }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ServicePrincipalMismatch'
        $result.Output.Count | Should -Be 0
    }

    It 'DoesNotBlessAdditionalProviderOrPrincipalPolicy: <Case>' -ForEach @(
        @{ Case = 'provider'; Code = 'EasyAuthMismatch' },
        @{ Case = 'group'; Code = 'CallerAllowlistMismatch' }
    ) {
        if ($Case -eq 'provider') { $fixture.AuthSettings.identityProviders.gitHub = @{ enabled = $true } }
        else { $fixture.AuthSettings.identityProviders.azureActiveDirectory.validation.defaultAuthorizationPolicy.allowedPrincipals.groups = @('99999999-9999-4999-8999-999999999999') }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match $Code
        $result.Output.Count | Should -Be 0
    }

    It 'DoesNotBlessUnexpectedAppRoleAssignmentRequirements' {
        $fixture.EntraServicePrincipal.appRoleAssignmentRequired = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ServicePrincipalMismatch'
        $result.Output.Count | Should -Be 0
    }

    It 'ForbiddenGraphReadIsNotVerified' {
        $fixture.GraphReadStatus = 403
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'GraphReadFailed'
        $result.Output.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'DoesNotUpdateAuthOrConsent' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        @($fixture.ArmRequests | Where-Object Method -ne 'GET').Count | Should -Be 0
        @($fixture.GraphRequests | Where-Object Method -ne 'GET').Count | Should -Be 0
        $fixture.GraphRequests.Path -join ',' | Should -Not -Match 'passwordCredentials|keyCredentials|oauth2PermissionGrants'
        $fixture.Mutations.Count | Should -Be 0
        $fixture.AccessMutations.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'test-only-account'
        $result.AllText | Should -Not -Match ([regex]::Escape($fixture.LastToken))
    }

    It 'WhatIfDoesNotReadAuthOrAcquireTokens' {
        $parameters.WhatIf = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldRun'
        $fixture.ArmRequests.Count | Should -Be 0
        $fixture.GraphRequests.Count | Should -Be 0
        @($fixture.Calls | Where-Object Name -eq 'Get-AzAccessToken').Count | Should -Be 0
    }
}
