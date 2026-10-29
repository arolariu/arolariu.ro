BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
}

Describe 'Per-invocation consent: <TaskName>' -ForEach @(
    @{ TaskName = 'Ensure-KeyVaultSecret' },
    @{ TaskName = 'Ensure-SqlContainedUser' },
    @{ TaskName = 'Ensure-SqlRoleMembership' },
    @{ TaskName = 'Set-AppConfigurationValue' },
    @{ TaskName = 'Set-AppConfigurationKeyVaultReference' }
) {
    BeforeEach {
        $fixture = New-TaskFixture
        $taskPath = Join-Path (Split-Path $PSScriptRoot) "$TaskName.ps1"
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription
            NonInteractive = $true; Confirm = $false
        }
        switch ($TaskName) {
            'Ensure-KeyVaultSecret' {
                $parameters.TargetResourceId = $fixture.VaultId
                $parameters.SecretName = 'api-jwt'
                $parameters.SecretValue = ConvertTo-SecureString 'synthetic' -AsPlainText -Force
            }
            'Ensure-SqlContainedUser' {
                $parameters.TargetResourceId = $fixture.DatabaseId
                $parameters.UserName = 'backend'
                $parameters.ExpectedSid = '0x11111111111111418111111111111111'
            }
            'Ensure-SqlRoleMembership' {
                $parameters.TargetResourceId = $fixture.DatabaseId
                $parameters.UserName = 'backend'
                $parameters.RoleName = 'db_datareader'
                $fixture.Principals.Add([pscustomobject]@{ Name = 'backend'; Type = 'E'; Sid = '0x11111111111111418111111111111111' })
            }
            'Set-AppConfigurationValue' {
                $parameters.TargetResourceId = $fixture.StoreId
                $parameters.Key = 'Feature:Name'; $parameters.Label = ''; $parameters.Value = 'enabled'; $parameters.ContentType = ''
            }
            'Set-AppConfigurationKeyVaultReference' {
                $parameters.TargetResourceId = $fixture.StoreId
                $parameters.Key = 'Auth:JWT:Secret'; $parameters.Label = 'PRODUCTION'
                $parameters.VaultResourceId = $fixture.VaultId; $parameters.SecretName = 'api-jwt'
                $fixture.SecretVersions = @(New-SecretMetadata)
            }
        }
    }

    It 'DoesNotAcceptSessionDefaultConfirmationAsInvocationConsent: <DefaultKey>' -ForEach @(
        @{ DefaultKey = '*:Confirm'; DefaultValue = $false },
        @{ DefaultKey = '*:cf'; DefaultValue = $false },
        @{ DefaultKey = '*:Con*'; DefaultValue = $false },
        @{ DefaultKey = 'script-scoped'; DefaultValue = $false },
        @{ DefaultKey = '*:Confirm'; DefaultValue = { $false } }
    ) {
        $parameters.Remove('Confirm')
        $key = if ($DefaultKey -eq 'script-scoped') { "${TaskName}.ps1:Confirm" } else { $DefaultKey }
        $fixture.DefaultParameterValues[$key] = $DefaultValue
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $fixture.Mutations.Count | Should -Be 0
        $result.ErrorText | Should -Match 'ConfirmationRequired'
        $result.Prompts | Should -Be 0
    }

    It 'DoesNotLetASessionDefaultSelectAutomationMode: <DefaultKey>' -ForEach @(
        @{ DefaultKey = '*:NonInteractive' }, @{ DefaultKey = '*:Non*' }
    ) {
        $parameters.Remove('NonInteractive')
        $fixture.DefaultParameterValues[$DefaultKey] = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $fixture.Mutations.Count | Should -Be 0
        $result.Output.Status | Should -Not -Contain 'Changed'
    }

    It 'AllowsExplicitConsentWithDisabledSessionDefaults' {
        $fixture.DefaultParameterValues = @{ '*:Confirm' = $false; '*:NonInteractive' = $true; Disabled = $true }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Changed'
        $fixture.Mutations.Count | Should -Be 1
        $result.Prompts | Should -Be 0
    }

    It 'KeepsNoninteractiveWhatIfReadOnlyWithAmbientConfirmationDefaults' {
        $parameters.Remove('Confirm')
        $parameters.WhatIf = $true
        $fixture.DefaultParameterValues = @{ '*:Confirm' = $false }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldChange'
        $fixture.Mutations.Count | Should -Be 0
        $result.Prompts | Should -Be 0
    }

    It 'RetainsManualConfirmationUnderSessionDefaults' {
        $parameters.Remove('NonInteractive')
        $parameters.Remove('Confirm')
        $fixture.DefaultParameterValues = @{ '*:Confirm' = $false }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Declined'
        $fixture.Mutations.Count | Should -Be 0
        $result.Prompts | Should -Be 1
    }
}
