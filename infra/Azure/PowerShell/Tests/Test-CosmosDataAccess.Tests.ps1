BeforeAll {
    . (Join-Path $PSScriptRoot 'TestSupport.ps1')
    $taskPath = Join-Path (Split-Path $PSScriptRoot) 'Test-CosmosDataAccess.ps1'
}

Describe 'Test-CosmosDataAccess' {
    BeforeEach {
        $fixture = New-TaskFixture
        $parameters = @{
            TenantId = $fixture.Tenant; SubscriptionId = $fixture.Subscription; ExpectedPrincipalId = $fixture.PrincipalId
            AccountResourceId = $fixture.CosmosAccountId; AccountEndpoint = $fixture.CosmosEndpoint
            DatabaseName = 'invoices'; ContainerName = 'receipts'
        }
        $fixture.HttpResponses[$fixture.CosmosEndpoint] = @{ StatusCode = 200; Content = '{"id":"task-cosmos","writableLocations":[]}' }
        $fixture.HttpResponses[$fixture.CosmosEndpoint + 'dbs/invoices'] = @{ StatusCode = 200; Content = '{"id":"invoices","_rid":"db-rid"}' }
        $fixture.HttpResponses[$fixture.CosmosEndpoint + 'dbs/invoices/colls/receipts'] = @{
            StatusCode = 200; Content = '{"id":"receipts","_rid":"coll-rid","partitionKey":{"paths":["/id"],"kind":"Hash"}}'
        }
        $fixture.HttpResponses[$fixture.CosmosEndpoint + 'dbs/invoices/colls/receipts/pkranges'] = @{
            StatusCode = 200; Content = '{"PartitionKeyRanges":[{"id":"0","minInclusive":"","maxExclusive":"FF"}]}'
        }
    }

    It 'RejectsInfrastructureActorForBackendExpectation' {
        $parameters.ExpectedPrincipalId = '77777777-7777-4777-8777-777777777777'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ActorMismatch'
        $fixture.HttpRequests.Count | Should -Be 0
        $fixture.AccessMutations.Count | Should -Be 0
        $fixture.Mutations.Count | Should -Be 0
    }

    It 'UsesAadForAccountAndDatabaseMetadata' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output.Count | Should -Be 1
        $result.Output[0].Status | Should -Be 'Verified'
        $result.Output[0].Changed | Should -BeFalse
        $result.Output[0].Checks.AccountMetadata | Should -Be 'Verified'
        $result.Output[0].Checks.DatabaseMetadata | Should -Be 'Verified'
        $token = @($fixture.Calls | Where-Object Name -eq 'Get-AzAccessToken')[0]
        $token.Arguments.ResourceUrl | Should -Be 'https://cosmos.azure.com/'
        $header = [uri]::UnescapeDataString($fixture.HttpRequests[0].Headers.Authorization)
        $header | Should -Match '^type=aad&ver=1\.0&sig='
        $fixture.HttpRequests[0].Uri | Should -Be 'https://task-cosmos.documents.azure.com/'
    }

    It 'ChecksContainerAndPartitionMetadata' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Checks.ContainerMetadata | Should -Be 'Verified'
        $result.Output[0].Checks.PartitionMetadata | Should -Be 'Verified'
        $fixture.HttpRequests[-1].Uri | Should -Be 'https://task-cosmos.documents.azure.com/dbs/invoices/colls/receipts/pkranges'
        $fixture.HttpRequests.Count | Should -Be 4
    }

    It 'ForbiddenMetadataIsFailureNotAbsence: <Status>' -ForEach @(
        @{ Status = 401 }, @{ Status = 403 }, @{ Status = 404 }, @{ Status = 429 }, @{ Status = 302 }
    ) {
        $fixture.HttpResponses[$fixture.CosmosEndpoint].StatusCode = $Status
        $fixture.HttpResponses[$fixture.CosmosEndpoint].Content = 'SENSITIVE-PROVIDER-BODY'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'CosmosMetadataRejected'
        $result.Output.Count | Should -Be 0
        $fixture.HttpRequests.Count | Should -Be 1
        $fixture.AccessMutations.Count | Should -Be 0
        $result.AllText | Should -Not -Match 'SENSITIVE-PROVIDER-BODY'
    }

    It 'RejectsUnsafeEndpointOrCrossScope: <Case>' -ForEach @(
        @{ Case = 'HTTP'; Endpoint = 'http://task-cosmos.documents.azure.com/'; CrossScope = $false },
        @{ Case = 'other host'; Endpoint = 'https://task-cosmos.example.invalid/'; CrossScope = $false },
        @{ Case = 'query'; Endpoint = 'https://task-cosmos.documents.azure.com/?token=x'; CrossScope = $false },
        @{ Case = 'resource mismatch'; Endpoint = 'https://different.documents.azure.com/'; CrossScope = $false },
        @{ Case = 'other subscription'; Endpoint = 'https://task-cosmos.documents.azure.com/'; CrossScope = $true }
    ) {
        $parameters.AccountEndpoint = $Endpoint
        if ($CrossScope) { $parameters.AccountResourceId = $fixture.CosmosAccountId -replace $fixture.Subscription, '99999999-9999-4999-8999-999999999999' }
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'TargetScope|TargetEndpoint'
        $fixture.HttpRequests.Count | Should -Be 0
        @($fixture.Calls | Where-Object Name -eq 'Get-AzAccessToken').Count | Should -Be 0
    }

    It 'WhatIfDoesNotProbeOrGrant' {
        $parameters.WhatIf = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $result.Output[0].Status | Should -Be 'WouldRun'
        $result.Output[0].Checks.AccountMetadata | Should -Be 'Planned'
        $fixture.HttpRequests.Count | Should -Be 0
        $fixture.AccessMutations.Count | Should -Be 0
        @($fixture.Calls | Where-Object Name -eq 'Get-AzAccessToken').Count | Should -Be 0
    }

    It 'NeverReadsKeysDocumentsOrLogsToken' {
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -BeNullOrEmpty
        $fixture.HttpRequests.Method | Should -Not -Contain 'POST'
        $fixture.HttpRequests.Uri -join ',' | Should -Not -Match '/docs|listKeys|management\.azure'
        @($fixture.HttpRequests | Where-Object { $_.MaximumRedirection -ne 0 -or $_.TimeoutSec -le 0 }).Count | Should -Be 0
        $result.AllText | Should -Not -Match ([regex]::Escape($fixture.LastToken))
        $result.AllText | Should -Not -Match 'test-only-account|SENSITIVE-PROVIDER-BODY'
    }

    It 'FailsClosedForOpaqueIdentityMetadata' {
        $fixture.OpaqueAccessToken = $true
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'ActorUnverifiable'
        $fixture.HttpRequests.Count | Should -Be 0
    }

    It 'RejectsMismatchedMetadataInsteadOfClaimingVerification' {
        $fixture.HttpResponses[$fixture.CosmosEndpoint + 'dbs/invoices'].Content = '{"id":"other-database"}'
        $result = Invoke-TaskUnderTest $taskPath $parameters $fixture
        $result.ErrorText | Should -Match 'CosmosMetadataInvalid'
        $result.Output.Count | Should -Be 0
    }
}
