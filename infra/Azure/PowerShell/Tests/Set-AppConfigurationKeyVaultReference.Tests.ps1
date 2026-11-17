BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Set-AppConfigurationKeyVaultReference.ps1'
    $referenceType = 'application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8'
}

Describe 'Set-AppConfigurationKeyVaultReference' {
    BeforeEach {
        $fixture = New-TaskFixture
        $fixture.SecretVersions = @(New-SecretMetadata)
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; TargetResourceId = $fixture.StoreId
            Key = 'Auth:JWT:Secret'; Label = 'PRODUCTION'; VaultResourceId = $fixture.VaultId; SecretName = 'api-jwt'
            NonInteractive = $true; Confirm = $false
        }
    }

    It 'EquivalentReferenceIsNoChangeDespiteJsonFormattingAndHostCasing' {
        $fixture.Settings.Add((New-Setting -Key 'Auth:JWT:Secret' -Label 'PRODUCTION' -ContentType $referenceType `
            -Value ' { "uri" : "https://TASK-VAULT.vault.azure.net/secrets/api-jwt" } '))
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output.Count | Should -Be 1
        $result.Output[0].Status | Should -Be 'NoChange'
        ($result.Output[0].Fields -join ',') | Should -Be 'Value,ContentType'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'WritesTypedVersionlessReferenceAndIsSequentiallyIdempotent' {
        $first = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $second = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $first.ErrorText | Should -BeNullOrEmpty
        $second.ErrorText | Should -BeNullOrEmpty
        $first.Output[0].Status | Should -Be 'Changed'
        $second.Output[0].Status | Should -Be 'NoChange'
        $fixture.Settings[0].ContentType | Should -BeExactly $referenceType
        ($fixture.Settings[0].Value | ConvertFrom-Json).uri | Should -BeExactly 'https://task-vault.vault.azure.net/secrets/api-jwt'
        $fixture.Mutations.Count | Should -Be 1
        $fixture.Mutations[0].Arguments.IfNoneMatch | Should -Be '*'
        @($fixture.Calls | Where-Object Name -eq 'Set-AzKeyVaultSecret').Count | Should -Be 0
    }

    It 'RejectsMissingOrUnusableSecret: <Case>' -ForEach @(
        @{ Case = 'missing'; Missing = $true; Enabled = $true; Expires = $null; Code = 'SecretMissing' },
        @{ Case = 'disabled'; Missing = $false; Enabled = $false; Expires = $null; Code = 'SecretUnusable' },
        @{ Case = 'expired'; Missing = $false; Enabled = $true; Expires = [datetime] '2000-01-01Z'; Code = 'SecretUnusable' }
    ) {
        $fixture.SecretVersions = @()
        if (-not $Missing) { $fixture.SecretVersions = @(New-SecretMetadata -Enabled $Enabled -Expires $Expires) }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match $Code
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RejectsForbiddenSourceMetadataRatherThanCreatingADanglingReference' {
        $fixture.SecretReadStatus = 403
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SecretReadFailed'
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'ClassifiesTypedNotFoundAsAMissingSourceWithoutWriting' {
        $fixture.SecretVersions = @()
        $fixture.SecretNotFoundThrows = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'SecretMissing'
        $fixture.Mutations.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'RejectsCrossScopeSource' {
        $parameters.VaultResourceId = $fixture.VaultId -replace $fixture.Subscription, '33333333-3333-4333-8333-333333333333'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetScope'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RejectsUnsafeSourceUri: <Case>' -ForEach @(
        @{ Case = 'HTTP'; Uri = 'http://task-vault.vault.azure.net/' },
        @{ Case = 'credentials'; Uri = 'https://operator:SENSITIVE-PROVIDER-BODY@task-vault.vault.azure.net/' },
        @{ Case = 'unexpected host'; Uri = 'https://task-vault.example.invalid/' },
        @{ Case = 'secret path'; Uri = 'https://task-vault.vault.azure.net/secrets/other' }
    ) {
        $fixture.Resources[0].Properties.vaultUri = $Uri
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetEndpoint'
        $fixture.Mutations.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'PreservesOtherKeysTagsAndCredentialsWhileReplacingOnlyTheSelectedValue' {
        $fixture.Settings.Add((New-Setting -Key 'Auth:JWT:Secret' -Label 'PRODUCTION' -Value 'SENSITIVE-PROVIDER-BODY' -Tag @{ owner = 'keep'; changed = 'old' }))
        $fixture.Settings.Add((New-Setting -Key 'Other:Credential' -Label 'PRODUCTION' -Value 'SENSITIVE-PROVIDER-BODY'))
        $parameters.Tags = @{ changed = 'new' }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.Settings.Count | Should -Be 2
        $changed = $fixture.Settings | Where-Object Key -eq 'Auth:JWT:Secret'
        $changed.Tag.owner | Should -Be 'keep'
        $changed.Tag.changed | Should -Be 'new'
        $changed.Description | Should -Be 'Unowned description'
        ($fixture.Settings | Where-Object Key -eq 'Other:Credential').Value | Should -Be 'SENSITIVE-PROVIDER-BODY'
        $fixture.Mutations[0].Arguments.IfMatch | Should -Be '"first-etag"'
        $result.Output[0].Fields | Should -Contain 'Tags'
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'UsesConditionalWriteAndHandlesEtagConflict: <Case>' -ForEach @(
        @{ Case = 'still different'; Satisfied = $false }, @{ Case = 'already satisfied'; Satisfied = $true }
    ) {
        $fixture.Settings.Add((New-Setting -Key 'Auth:JWT:Secret' -Label 'PRODUCTION'))
        $fixture.AppWriteStatus = 412
        $fixture.AppConflictSatisfies = $Satisfied
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        if ($Satisfied) {
            $result.ErrorText | Should -BeNullOrEmpty
            $result.Output[0].Status | Should -Be 'NoChange'
        }
        else { $result.ErrorText | Should -Match 'StaleState' }
        @($fixture.Calls | Where-Object Name -eq 'Set-AzAppConfigurationKeyValue').Count | Should -Be 1
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RefusesLockedOrUnreadableDestination: <Case>' -ForEach @(
        @{ Case = 'locked'; Locked = $true; Status = 0; Code = 'SettingLocked' },
        @{ Case = 'forbidden'; Locked = $false; Status = 403; Code = 'SettingReadFailed' }
    ) {
        $fixture.Settings.Add((New-Setting -Key 'Auth:JWT:Secret' -Label 'PRODUCTION' -Locked $Locked))
        $fixture.AppReadStatus = $Status
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match $Code
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'DoesNotAcceptArbitraryPlaintextValueInput' {
        $parameters.Value = 'SENSITIVE-PROVIDER-BODY'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'Value'
        $fixture.Mutations.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'ConfirmsBothSourceAndDestinationAndDeclinesWithoutWrites' {
        $parameters.NonInteractive = $false
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'Declined'
        $result.Prompts | Should -Be 1
        $result.AllText | Should -Match ([regex]::Escape($fixture.VaultId))
        $result.AllText | Should -Match ([regex]::Escape($fixture.StoreId))
        $result.AllText | Should -Match 'api-jwt'
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'WhatIfNeedsNoMutationConsentAndNeverPrompts' {
        $parameters.Remove('Confirm')
        $parameters.WhatIf = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldChange'
        $result.Prompts | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
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
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'RejectsAmbiguousNoninteractiveScope' {
        $parameters.Remove('TargetResourceId')
        $parameters.ResourceGroupName = 'task-tests'
        $parameters.StoreName = '*'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'AmbiguousTarget'
        $result.Prompts | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }
}
