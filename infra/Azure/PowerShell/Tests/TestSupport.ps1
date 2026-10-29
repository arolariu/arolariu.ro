if (-not ('TaskTestHost' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Management.Automation;
using System.Management.Automation.Host;
using System.Security;

public sealed class TaskTestSqlException : Exception {
    public int Number { get; }
    public TaskTestSqlException(int number) : base("SENSITIVE-PROVIDER-BODY") { Number = number; }
}
public sealed class TaskTestHost : PSHost {
    private readonly TaskTestUI ui;
    public TaskTestHost(bool approve, string[] inputs) { ui = new TaskTestUI(approve, inputs); }
    public TaskTestUI RecordingUI => ui;
    public override PSHostUserInterface UI => ui;
    public override string Name => "BootstrapTaskTests";
    public override Version Version => new Version(1, 0);
    public override Guid InstanceId { get; } = Guid.NewGuid();
    public override CultureInfo CurrentCulture => CultureInfo.InvariantCulture;
    public override CultureInfo CurrentUICulture => CultureInfo.InvariantCulture;
    public override void EnterNestedPrompt() => throw new NotSupportedException();
    public override void ExitNestedPrompt() => throw new NotSupportedException();
    public override void NotifyBeginApplication() { }
    public override void NotifyEndApplication() { }
    public override void SetShouldExit(int exitCode) { }
}
public sealed class TaskTestUI : PSHostUserInterface {
    private readonly bool approve;
    private readonly Queue<string> inputs;
    public List<string> Messages { get; } = new List<string>();
    public int Prompts { get; private set; }
    public TaskTestUI(bool approve, string[] inputs) { this.approve = approve; this.inputs = new Queue<string>(inputs); }
    public override PSHostRawUserInterface RawUI => null;
    public override string ReadLine() { Prompts++; return inputs.Count > 0 ? inputs.Dequeue() : ""; }
    public override SecureString ReadLineAsSecureString() {
        var value = new SecureString();
        foreach (char c in ReadLine()) value.AppendChar(c);
        value.MakeReadOnly();
        return value;
    }
    public override int PromptForChoice(string caption, string message, Collection<ChoiceDescription> choices, int defaultChoice) {
        Prompts++; Messages.Add(caption + " " + message);
        for (int i = 0; i < choices.Count; i++)
            if (choices[i].Label.Replace("&", "") == (approve ? "Yes" : "No")) return i;
        throw new InvalidOperationException("Unexpected confirmation choices.");
    }
    public override Dictionary<string, PSObject> Prompt(string caption, string message, Collection<FieldDescription> fields) {
        var result = new Dictionary<string, PSObject>();
        foreach (var field in fields)
            result[field.Name] = PSObject.AsPSObject(field.ParameterTypeName == "SecureString"
                ? (object)ReadLineAsSecureString() : ReadLine());
        return result;
    }
    public override PSCredential PromptForCredential(string caption, string message, string userName, string targetName)
        => throw new InvalidOperationException("Unexpected credential prompt.");
    public override PSCredential PromptForCredential(string caption, string message, string userName, string targetName,
        PSCredentialTypes types, PSCredentialUIOptions options) => throw new InvalidOperationException("Unexpected credential prompt.");
    public override void Write(string value) => Messages.Add(value);
    public override void Write(ConsoleColor foregroundColor, ConsoleColor backgroundColor, string value) => Messages.Add(value);
    public override void WriteLine(string value) => Messages.Add(value);
    public override void WriteErrorLine(string value) => Messages.Add(value);
    public override void WriteDebugLine(string value) => Messages.Add(value);
    public override void WriteVerboseLine(string value) => Messages.Add(value);
    public override void WriteWarningLine(string value) => Messages.Add(value);
    public override void WriteProgress(long sourceId, ProgressRecord record) { }
}
'@
}

function New-TaskFixture {
    $subscription = '11111111-1111-4111-8111-111111111111'
    $tenant = '22222222-2222-4222-8222-222222222222'
    $vaultId = "/subscriptions/$subscription/resourceGroups/task-tests/providers/Microsoft.KeyVault/vaults/task-vault"
    $storeId = "/subscriptions/$subscription/resourceGroups/task-tests/providers/Microsoft.AppConfiguration/configurationStores/task-store"
    $serverId = "/subscriptions/$subscription/resourceGroups/task-tests/providers/Microsoft.Sql/servers/task-sql"
    $databaseId = "$serverId/databases/invoices"
    $applicationClientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    $aiAccountId = "/subscriptions/$subscription/resourceGroups/task-tests/providers/Microsoft.CognitiveServices/accounts/task-ai"
    $aiDeployments = [Collections.Generic.List[object]]::new()
    $aiAccounts = [Collections.Generic.List[object]]::new()
    $aiAccounts.Add(@{
        id = $aiAccountId; name = 'task-ai'; type = 'Microsoft.CognitiveServices/accounts'; kind = 'OpenAI'; location = 'swedencentral'
        etag = 'account-first'; sku = @{ name = 'S0' }
        properties = @{ dateCreated = '2026-01-01T00:00:00Z'; provisioningState = 'Succeeded' }
        systemData = @{ createdAt = '2026-01-01T00:00:00Z' }
    })
    $aiDeployments.Add(@{
        id = "$aiAccountId/deployments/main"; name = 'main'; type = 'Microsoft.CognitiveServices/accounts/deployments'; etag = 'deployment-first'
        sku = @{ name = 'GlobalStandard'; capacity = 1 }
        properties = @{ model = @{ format = 'OpenAI'; name = 'gpt-4.1-mini'; version = '2025-04-14' }; provisioningState = 'Succeeded' }
        systemData = @{ createdAt = '2026-01-01T00:00:00Z' }
    })
    [pscustomobject]@{
        Tenant = $tenant
        Subscription = $subscription
        VaultId = $vaultId
        StoreId = $storeId
        DatabaseId = $databaseId
        CosmosAccountId = "/subscriptions/$subscription/resourceGroups/task-tests/providers/Microsoft.DocumentDB/databaseAccounts/task-cosmos"
        CosmosEndpoint = 'https://task-cosmos.documents.azure.com/'
        ExpSiteId = "/subscriptions/$subscription/resourceGroups/task-tests/providers/Microsoft.Web/sites/task-exp"
        AiAccountId = $aiAccountId
        AiAccounts = $aiAccounts
        AiDeletedAccounts = [Collections.Generic.List[object]]::new()
        AiAccountReads = 0
        AiChangeAccountOnRead = 0
        AiAddDeploymentOnAccountRead = 0
        AiRecreateAccountAfterDelete = $false
        AiPurgeStatus = 0
        AiDeletedReads = 0
        AiChangeDeletedOnRead = 0
        AiListDeletedOriginalIds = $false
        AiDeployments = $aiDeployments
        AiReadStatus = 0
        AiDeleteStatus = 0
        AiDeploymentReads = 0
        AiChangeDeploymentOnRead = 0
        AiDeletePendingReads = 0
        AiPendingDeletionId = ''
        AiRecreateAfterDelete = $false
        ExpServiceUri = 'https://task-exp.azurewebsites.net/'
        EasyAuthReadyStatus = 200
        EasyAuthAnonymousStatus = 401
        EasyAuthAllowedStatus = 404
        EasyAuthDeniedStatus = 403
        EasyAuthWrongAudienceStatus = 401
        EasyAuthAllowedPrincipalIds = @('44444444-4444-4444-8444-444444444444')
        ApplicationClientId = $applicationClientId
        GraphReadStatus = 0
        GraphWriteStatus = 0
        EntraApplicationDeleted = $false
        EntraServicePrincipalDeleted = $false
        EntraAutoDeleteLinkedSp = $true
        OtherEntraApplications = [Collections.Generic.List[object]]::new()
        OtherEntraServicePrincipals = [Collections.Generic.List[object]]::new()
        EntraDeletedObjects = [Collections.Generic.List[object]]::new()
        GraphApplicationReads = 0
        GraphChangeApplicationOnRead = 0
        GraphPrincipalReads = 0
        GraphChangePrincipalOnRead = 0
        GraphRequests = [Collections.Generic.List[object]]::new()
        AuthReadStatus = 0
        AuthSettings = @{
            platform = @{ enabled = $true }
            globalValidation = @{ requireAuthentication = $true; unauthenticatedClientAction = 'Return401'; excludedPaths = @('/api/health', '/api/ready') }
            identityProviders = @{ azureActiveDirectory = @{
                enabled = $true
                registration = @{ clientId = $applicationClientId; openIdIssuer = "https://login.microsoftonline.com/$tenant/v2.0" }
                validation = @{ defaultAuthorizationPolicy = @{ allowedPrincipals = @{ identities = @('44444444-4444-4444-8444-444444444444') } } }
            } }
        }
        EntraApplication = @{
            '@odata.type' = '#microsoft.graph.application'
            id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'; appId = $applicationClientId; displayName = 'Task experiments'
            uniqueName = 'task-experiments'; signInAudience = 'AzureADMyOrg'
            identifierUris = @("api://$applicationClientId"); api = @{ requestedAccessTokenVersion = 2 }
            publisherDomain = 'task.onmicrosoft.com'
        }
        EntraServicePrincipal = @{
            '@odata.type' = '#microsoft.graph.servicePrincipal'
            id = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb'; appId = $applicationClientId; displayName = 'Task experiments'
            servicePrincipalType = 'Application'; appOwnerOrganizationId = $tenant; accountEnabled = $true; appRoleAssignmentRequired = $false
            signInAudience = 'AzureADMyOrg'; applicationTemplateId = $null; publisherName = 'Task publisher'
        }
        HttpRequests = [Collections.Generic.List[object]]::new()
        HttpResponses = @{}
        PrincipalId = '44444444-4444-4444-8444-444444444444'
        ClientId = '55555555-5555-4555-8555-555555555555'
        ActorKind = 'User'
        OmitIdentityType = $false
        LastToken = ''
        Context = [pscustomobject]@{
            Tenant = [pscustomobject]@{ Id = $tenant }
            Subscription = [pscustomobject]@{ Id = $subscription }
            Account = [pscustomobject]@{ Type = 'User'; Id = 'test-only-account' }
            Environment = [pscustomobject]@{
                Name = 'AzureCloud'
                AzureKeyVaultDnsSuffix = 'vault.azure.net'
                SqlDatabaseDnsSuffix = '.database.windows.net'
            }
        }
        Resources = @([pscustomobject]@{
            ResourceId = $vaultId
            ResourceType = 'Microsoft.KeyVault/vaults'
            ResourceGroupName = 'task-tests'
            Name = 'task-vault'
            Properties = [pscustomobject]@{ vaultUri = 'https://task-vault.vault.azure.net/' }
        }, [pscustomobject]@{
            ResourceId = $storeId
            ResourceType = 'Microsoft.AppConfiguration/configurationStores'
            ResourceGroupName = 'task-tests'
            Name = 'task-store'
            Properties = [pscustomobject]@{ endpoint = 'https://task-store.azconfig.io' }
        }, [pscustomobject]@{
            ResourceId = $serverId; ResourceType = 'Microsoft.Sql/servers'; ResourceGroupName = 'task-tests'; Name = 'task-sql'
            Properties = [pscustomobject]@{ fullyQualifiedDomainName = 'task-sql.database.windows.net' }
        }, [pscustomobject]@{
            ResourceId = $databaseId; ResourceType = 'Microsoft.Sql/servers/databases'
            ResourceGroupName = 'task-tests'; Name = 'task-sql/invoices'; Properties = [pscustomobject]@{}
        })
        SecretVersions = @()
        RemovedSecrets = @()
        SecretReads = 0
        SecretAppearsOnRead = 0
        ResourceReadStatus = 0
        SecretReadStatus = 0
        SecretWriteStatus = 0
        SecretNotFoundThrows = $false
        RemovedNotFoundThrows = $false
        Settings = [Collections.Generic.List[object]]::new()
        AppReadStatus = 0
        AppWriteStatus = 0
        AppConflictSatisfies = $false
        ChangeContextAfterAppRead = $false
        Principals = [Collections.Generic.List[object]]::new()
        Roles = @('db_datareader', 'db_datawriter', 'db_ddladmin')
        Memberships = [Collections.Generic.List[object]]::new()
        SqlReads = 0
        SqlAppearsOnRead = 0
        SqlReadStatus = 0
        SqlWriteStatus = 0
        SqlCreateRace = $false
        SqlRoleRace = $false
        SqlAdministrator = [pscustomobject]@{
            ObjectId = '88888888-8888-4888-8888-888888888888'; PrincipalType = 'Application'
            Login = 'infrastructure'; TenantId = $tenant; AdministratorType = 'ActiveDirectory'
        }
        SqlEntraOnly = $true
        SqlRequireAdministrator = $false
        SqlRequireFirewall = $false
        SqlCanManage = $true
        SqlCanInspect = $true
        SqlProbeUserName = 'backend'
        SqlProbeUserType = 'E'
        SqlProbeSid = '0x33221100554477668899AABBCCDDEEFF'
        SqlProbePermissions = @{ CanConnect = 1; CanSelect = 1; CanInsert = 1; CanUpdate = 1; CanDelete = 1 }
        SqlRequiredTables = @('dbo.AspNetUsers', 'dbo.AspNetRoles')
        SqlObjectDenied = $false
        SqlAdministratorUnknown = $false
        SqlConcurrentAdministratorChange = $false
        SqlRestoreStatus = 0
        SqlPatchFailsAfterChange = $false
        SqlFirewallRemovalStatus = 0
        SqlClientIPAddress = '203.0.113.17'
        SqlFirewallRules = [Collections.Generic.List[object]]::new()
        SqlAdministratorPatches = [Collections.Generic.List[object]]::new()
        SqlAccessReceiptPhases = [Collections.Generic.List[string]]::new()
        TokenReadStatus = 0
        OpaqueAccessToken = $false
        RoleAssignments = [Collections.Generic.List[object]]::new()
        AccessMutations = [Collections.Generic.List[object]]::new()
        ArmRequests = [Collections.Generic.List[object]]::new()
        RoleGrantStatus = 0
        RoleCleanupStatus = 0
        FailAfterRoleGrant = $false
        AddConcurrentRoleOnSecretWrite = $false
        ExpectedReceiptPath = ''
        ReceiptPhasesAtGrant = [Collections.Generic.List[string]]::new()
        Clock = [datetime]::UtcNow
        Calls = [Collections.Generic.List[object]]::new()
        Mutations = [Collections.Generic.List[object]]::new()
        Approve = $false
        Inputs = @()
        ConfirmPreference = 'None'
        DefaultParameterValues = @{}
    }
}

function New-TestAccessToken {
    param($Fixture, [string] $ResourceUrl)
    $claims = @{
        tid = $Fixture.Tenant; oid = $Fixture.PrincipalId; azp = $Fixture.ClientId
        idtyp = $(if ($Fixture.ActorKind -eq 'User') { 'user' } else { 'app' })
        aud = $(if ($ResourceUrl) { $ResourceUrl } else { 'https://management.azure.com/' })
        exp = [datetimeoffset]::UtcNow.AddMinutes(10).ToUnixTimeSeconds()
        iss = "https://login.microsoftonline.com/$($Fixture.Tenant)/v2.0"; ver = '2.0'
    }
    if ($Fixture.OmitIdentityType) { $claims.Remove('idtyp') }
    $header = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('{"alg":"none"}')).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    $payload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($claims | ConvertTo-Json -Compress))).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    $Fixture.LastToken = "$header.$payload.test"
    ConvertTo-SecureString $Fixture.LastToken -AsPlainText -Force
}

function New-SignedWrongAudienceToken {
    param($Fixture, [switch] $BadSignature, [switch] $Expired)
    $rsa = [Security.Cryptography.RSA]::Create(2048)
    try {
        $public = $rsa.ExportParameters($false)
        $encode = { param([byte[]] $Bytes) [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_') }
        $jwk = @{ kty = 'RSA'; use = 'sig'; kid = 'test-key'; n = (& $encode $public.Modulus); e = (& $encode $public.Exponent) }
        $Fixture.HttpResponses["https://login.microsoftonline.com/$($Fixture.Tenant)/discovery/v2.0/keys"] = @{
            StatusCode = 200; Content = (@{ keys = @($jwk) } | ConvertTo-Json -Depth 6 -Compress)
        }
        $header = & $encode ([Text.Encoding]::UTF8.GetBytes('{"alg":"RS256","kid":"test-key","typ":"JWT"}'))
        $claims = @{
            tid = $Fixture.Tenant; oid = $Fixture.PrincipalId; azp = $Fixture.ClientId
            iss = "https://login.microsoftonline.com/$($Fixture.Tenant)/v2.0"; ver = '2.0'
            aud = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'; nbf = [datetimeoffset]::UtcNow.AddMinutes(-1).ToUnixTimeSeconds()
            exp = [datetimeoffset]::UtcNow.AddMinutes($(if ($Expired) { -1 } else { 10 })).ToUnixTimeSeconds()
        }
        $payload = & $encode ([Text.Encoding]::UTF8.GetBytes(($claims | ConvertTo-Json -Compress)))
        $data = [Text.Encoding]::UTF8.GetBytes("$header.$payload")
        $signature = $rsa.SignData($data, [Security.Cryptography.HashAlgorithmName]::SHA256, [Security.Cryptography.RSASignaturePadding]::Pkcs1)
        if ($BadSignature) { $signature[0] = $signature[0] -bxor 1 }
        ConvertTo-SecureString "$header.$payload.$(& $encode $signature)" -AsPlainText -Force
    }
    finally { $rsa.Dispose() }
}

function New-Setting {
    param([string] $Key = 'Feature:Name', [string] $Label = 'DEVELOPMENT', [string] $Value = 'before',
        [string] $ContentType = '', [hashtable] $Tag = @{}, [bool] $Locked = $false)
    [pscustomobject]@{
        Key = $Key; Label = $(if ($Label.Length) { $Label } else { $null }); Value = $Value
        ContentType = $ContentType; Tag = $Tag; Locked = $Locked; Etag = 'first-etag'
        Description = 'Unowned description'; LastModified = [datetime] '2026-01-01Z'; SyncToken = $null; XmsRequestId = 'test'
    }
}

function New-SecretMetadata {
    param([string] $Name = 'api-jwt', [bool] $Enabled = $true, $Expires = $null, $NotBefore = $null)
    [pscustomobject]@{
        Name = $Name
        VaultName = 'task-vault'
        Version = 'first-version'
        Id = "https://task-vault.vault.azure.net/secrets/$Name/first-version"
        Enabled = $Enabled
        Expires = $Expires
        NotBefore = $NotBefore
        Created = [datetime] '2026-01-01T00:00:00Z'
        Updated = [datetime] '2026-01-01T00:00:00Z'
        ContentType = ''
        Tags = @{}
    }
}

function Invoke-TaskUnderTest {
    param([string] $Path, [hashtable] $Parameters, $Fixture)
    $state = [Management.Automation.Runspaces.InitialSessionState]::CreateDefault()
    $state.ImportPSModule(@('Microsoft.PowerShell.Utility', 'Microsoft.PowerShell.Security', 'Microsoft.PowerShell.Management'))
    $state.Variables.Add([Management.Automation.Runspaces.SessionStateVariableEntry]::new('Fixture', $Fixture, 'External state'))
    $definitions = @{
        'Trace-Boundary' = {
            param($Name, $Arguments)
            $Fixture.Calls.Add([pscustomobject]@{ Name = $Name; Arguments = $Arguments })
        }
        'Throw-BoundaryError' = {
            param([int] $Status)
            throw [Net.Http.HttpRequestException]::new('SENSITIVE-PROVIDER-BODY', $null, [Net.HttpStatusCode] $Status)
        }
        'Record-SqlAccessPhase' = {
            if ($Fixture.ExpectedReceiptPath) {
                $stored = Get-Content -LiteralPath $Fixture.ExpectedReceiptPath -Raw | ConvertFrom-Json
                $Fixture.SqlAccessReceiptPhases.Add($stored.Phase)
            }
        }
        'Get-AzContext' = {
            [CmdletBinding()] param()
            Trace-Boundary 'Get-AzContext' $PSBoundParameters
            $Fixture.Context
        }
        'Get-AzResource' = {
            [CmdletBinding()] param($ResourceId, $ResourceGroupName, $ResourceType, $Name, [switch] $ExpandProperties, $DefaultProfile)
            Trace-Boundary 'Get-AzResource' $PSBoundParameters
            if ($Fixture.ResourceReadStatus) { Throw-BoundaryError $Fixture.ResourceReadStatus }
            $Fixture.Resources | Where-Object {
                if ($ResourceId) { $_.ResourceId -ieq $ResourceId }
                else {
                    $_.ResourceGroupName -ieq $ResourceGroupName -and
                    $_.ResourceType -ieq $ResourceType -and $_.Name -like $Name
                }
            }
        }
        'Get-AzKeyVaultSecret' = {
            [CmdletBinding()] param($VaultName, $Name, [switch] $IncludeVersions, [switch] $InRemovedState, $DefaultProfile)
            Trace-Boundary 'Get-AzKeyVaultSecret' $PSBoundParameters
            if ($Fixture.SecretReadStatus) {
                $access = @($Fixture.RoleAssignments | Where-Object {
                    $_.ObjectId -eq $Fixture.PrincipalId -and $_.Scope -eq $Fixture.VaultId -and
                    $_.RoleDefinitionId -match '(b86a8fe4-44ce-4948-aee5-eccb2c155cd7|21090545-7ca7-4776-b22c-e363652d74d2|00482a5a-887f-4fb3-b363-3b7fe8e74483)$'
                }).Count -gt 0
                if (-not ($Fixture.SecretReadStatus -eq 403 -and $access)) { Throw-BoundaryError $Fixture.SecretReadStatus }
            }
            if ($InRemovedState) {
                if ($Fixture.RemovedNotFoundThrows -and -not $Fixture.RemovedSecrets.Count) { Throw-BoundaryError 404 }
                return $Fixture.RemovedSecrets
            }
            if (-not $IncludeVersions) { throw 'Tests forbid retrieving secret material.' }
            $Fixture.SecretReads++
            if ($Fixture.SecretAppearsOnRead -and $Fixture.SecretReads -ge $Fixture.SecretAppearsOnRead) {
                return New-SecretMetadata -Name $Name
            }
            if ($Fixture.SecretNotFoundThrows -and -not $Fixture.SecretVersions.Count) { Throw-BoundaryError 404 }
            $Fixture.SecretVersions
        }
        'Set-AzKeyVaultSecret' = {
            [CmdletBinding(SupportsShouldProcess)] param($VaultName, $Name, [securestring] $SecretValue, $DefaultProfile)
            Trace-Boundary 'Set-AzKeyVaultSecret' $PSBoundParameters
            if ($Fixture.SecretWriteStatus) { Throw-BoundaryError $Fixture.SecretWriteStatus }
            $Fixture.Mutations.Add([pscustomobject]@{ Name = 'SetSecret'; Arguments = $PSBoundParameters })
            $Fixture.SecretVersions = @(New-SecretMetadata -Name $Name)
            if ($Fixture.AddConcurrentRoleOnSecretWrite) {
                $Fixture.RoleAssignments.Add([pscustomobject]@{
                    RoleAssignmentId = "$($Fixture.VaultId)/providers/Microsoft.Authorization/roleAssignments/77777777-7777-4777-8777-777777777777"
                    Scope = $Fixture.VaultId; ObjectId = $Fixture.PrincipalId
                    RoleDefinitionId = '21090545-7ca7-4776-b22c-e363652d74d2'; Description = 'concurrent'; Condition = ''
                })
            }
            [pscustomobject]@{ SecretValueText = 'SENSITIVE-PROVIDER-BODY'; SecretValue = $SecretValue }
        }
        'Get-AzAppConfigurationKeyValue' = {
            [CmdletBinding()] param($Endpoint, $Key, $Label, $After)
            Trace-Boundary 'Get-AzAppConfigurationKeyValue' $PSBoundParameters
            if ($Fixture.AppReadStatus) {
                $access = @($Fixture.RoleAssignments | Where-Object {
                    $_.ObjectId -eq $Fixture.PrincipalId -and $_.Scope -eq $Fixture.StoreId -and
                    $_.RoleDefinitionId -match '5ae67dd6-50cb-40e7-96ff-dc2bfa4b606b$'
                }).Count -gt 0
                if (-not ($Fixture.AppReadStatus -eq 403 -and $access)) { Throw-BoundaryError $Fixture.AppReadStatus }
            }
            $literalKey = [regex]::Replace($Key, '\\([\\*,])', '$1')
            $literalLabel = if ($Label -eq [string][char] 0) { '' } else { [regex]::Replace($Label, '\\([\\*,])', '$1') }
            $items = @($Fixture.Settings | Where-Object { $_.Key -ceq $literalKey -and [string] $_.Label -ceq $literalLabel })
            if ($Fixture.ChangeContextAfterAppRead) {
                $Fixture.Context.Subscription.Id = '33333333-3333-4333-8333-333333333333'
                $Fixture.ChangeContextAfterAppRead = $false
            }
            $items
        }
        'Set-AzAppConfigurationKeyValue' = {
            [CmdletBinding(SupportsShouldProcess)]
            param($Endpoint, $Key, $Label, $Value, $ContentType, [hashtable] $Tag, $Description, $IfMatch, $IfNoneMatch)
            Trace-Boundary 'Set-AzAppConfigurationKeyValue' $PSBoundParameters
            $existing = @($Fixture.Settings | Where-Object { $_.Key -ceq $Key -and [string] $_.Label -ceq [string] $Label })
            if ($Fixture.AppWriteStatus -and -not $Fixture.AppConflictSatisfies) { Throw-BoundaryError $Fixture.AppWriteStatus }
            if (($existing.Count -and $IfMatch -cne ('"' + $existing[0].Etag + '"')) -or (-not $existing.Count -and $IfNoneMatch -ne '*')) {
                Throw-BoundaryError 412
            }
            $next = New-Setting -Key $Key -Label $Label -Value $Value -ContentType $ContentType -Tag $Tag
            $next.Description = $Description
            $next.Etag = 'next-etag'
            if ($existing.Count) { $null = $Fixture.Settings.Remove($existing[0]) }
            $Fixture.Settings.Add($next)
            if ($Fixture.AppConflictSatisfies) { Throw-BoundaryError 412 }
            $Fixture.Mutations.Add([pscustomobject]@{ Name = 'SetSetting'; Arguments = $PSBoundParameters })
            $next
        }
        'Get-AzAccessToken' = {
            [CmdletBinding()] param($ResourceUrl, $DefaultProfile)
            Trace-Boundary 'Get-AzAccessToken' $PSBoundParameters
            if ($Fixture.TokenReadStatus) { Throw-BoundaryError $Fixture.TokenReadStatus }
            $secureToken = if ($Fixture.OpaqueAccessToken) { ConvertTo-SecureString 'opaque-test-credential' -AsPlainText -Force }
                else { New-TestAccessToken -Fixture $Fixture -ResourceUrl $ResourceUrl }
            [pscustomobject]@{
                Token = $secureToken
                ExpiresOn = [datetimeoffset]::UtcNow.AddMinutes(10)
                TenantId = $Fixture.Tenant; UserId = 'synthetic'; Type = 'Bearer'
            }
        }
        'Get-AzRoleAssignment' = {
            [CmdletBinding()] param($ObjectId, $Scope, $DefaultProfile)
            Trace-Boundary 'Get-AzRoleAssignment' $PSBoundParameters
            $Fixture.RoleAssignments | Where-Object {
                $_.ObjectId -eq $ObjectId -and ($Scope -eq $_.Scope -or $Scope.StartsWith($_.Scope + '/', [StringComparison]::OrdinalIgnoreCase))
            }
        }
        'Invoke-AzRestMethod' = {
            [CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Medium')]
            param($Path, $Method, $Payload, $DefaultProfile, [switch] $WaitForCompletion)
            Trace-Boundary 'Invoke-AzRestMethod' $PSBoundParameters
            $Fixture.ArmRequests.Add([pscustomobject]@{ Method = $Method; Path = $Path })
            $id = ($Path -split '\?')[0]
            if (-not $PSCmdlet.ShouldProcess($id, $Method)) { return }
            if ($id -match '/providers/Microsoft\.CognitiveServices/(?:deletedAccounts|locations/[^/]+/resourceGroups/[^/]+/deletedAccounts/[^/]+)$') {
                if ($Method -eq 'GET') {
                    if ($Fixture.AiReadStatus) { Throw-BoundaryError $Fixture.AiReadStatus }
                    if ($id -match '/providers/Microsoft\.CognitiveServices/deletedAccounts$') {
                        $records = @($Fixture.AiDeletedAccounts | ForEach-Object {
                            $record = $_.Clone()
                            if ($Fixture.AiListDeletedOriginalIds -and $record.id -match '^/subscriptions/([^/]+)/providers/Microsoft.CognitiveServices/locations/[^/]+/resourceGroups/([^/]+)/deletedAccounts/([^/]+)$') {
                                $record.id = "/subscriptions/$($Matches[1])/resourceGroups/$($Matches[2])/providers/Microsoft.CognitiveServices/accounts/$($Matches[3])"
                            }
                            $record
                        })
                        return [pscustomobject]@{ StatusCode = 200; Content = (@{ value = $records } | ConvertTo-Json -Depth 10 -Compress) }
                    }
                    $Fixture.AiDeletedReads++
                    $items = @($Fixture.AiDeletedAccounts | Where-Object { $_.id -ieq $id })
                    if (-not $items.Count) { Throw-BoundaryError 404 }
                    if ($Fixture.AiChangeDeletedOnRead -and $Fixture.AiDeletedReads -ge $Fixture.AiChangeDeletedOnRead) {
                        $items[0].properties.deletionDate = '2026-03-01T00:00:00Z'; $items[0].etag = 'new-deletion'
                    }
                    return [pscustomobject]@{ StatusCode = 200; Content = ($items[0] | ConvertTo-Json -Depth 10 -Compress) }
                }
                if ($Method -eq 'DELETE') {
                    if ($Fixture.AiPurgeStatus) { Throw-BoundaryError $Fixture.AiPurgeStatus }
                    $items = @($Fixture.AiDeletedAccounts | Where-Object { $_.id -ieq $id })
                    if ($items.Count) { $null = $Fixture.AiDeletedAccounts.Remove($items[0]) }
                    $Fixture.Mutations.Add([pscustomobject]@{ Name = 'PurgeDeletedAiAccount'; Id = $id })
                    return [pscustomobject]@{ StatusCode = 204; Content = '' }
                }
                throw 'Unexpected deleted AI operation.'
            }
            if ($id -match '/providers/Microsoft\.CognitiveServices/accounts(?:/[^/]+)?$') {
                if ($Method -eq 'GET') {
                    if ($Fixture.AiReadStatus) { Throw-BoundaryError $Fixture.AiReadStatus }
                    if ($id -like '*/accounts') {
                        $items = @($Fixture.AiAccounts | Where-Object { $_.id.StartsWith($id + '/', [StringComparison]::OrdinalIgnoreCase) })
                        return [pscustomobject]@{ StatusCode = 200; Content = (@{ value = $items } | ConvertTo-Json -Depth 10 -Compress) }
                    }
                    $Fixture.AiAccountReads++
                    $items = @($Fixture.AiAccounts | Where-Object { $_.id -ieq $id })
                    if (-not $items.Count) { Throw-BoundaryError 404 }
                    if ($Fixture.AiChangeAccountOnRead -and $Fixture.AiAccountReads -ge $Fixture.AiChangeAccountOnRead) {
                        $items[0].etag = 'account-recreated'; $items[0].properties.dateCreated = '2026-02-01T00:00:00Z'
                    }
                    if ($Fixture.AiAddDeploymentOnAccountRead -and $Fixture.AiAccountReads -ge $Fixture.AiAddDeploymentOnAccountRead -and -not $Fixture.AiDeployments.Count) {
                        $Fixture.AiDeployments.Add(@{
                            id = "$id/deployments/concurrent"; name = 'concurrent'; type = 'Microsoft.CognitiveServices/accounts/deployments'
                            sku = @{ name = 'GlobalStandard'; capacity = 1 }; properties = @{ model = @{ name = 'concurrent' }; provisioningState = 'Succeeded' }
                        })
                    }
                    return [pscustomobject]@{ StatusCode = 200; Content = ($items[0] | ConvertTo-Json -Depth 10 -Compress) }
                }
                if ($Method -eq 'DELETE') {
                    if ($Fixture.AiDeleteStatus) { Throw-BoundaryError $Fixture.AiDeleteStatus }
                    $items = @($Fixture.AiAccounts | Where-Object { $_.id -ieq $id })
                    if ($items.Count) {
                        $null = $Fixture.AiAccounts.Remove($items[0])
                        $Fixture.AiDeletedAccounts.Add($items[0])
                        if ($Fixture.AiRecreateAccountAfterDelete) {
                            $replacement = $items[0].Clone()
                            $replacement.properties = @{ dateCreated = '2026-02-01T00:00:00Z'; provisioningState = 'Succeeded' }
                            $replacement.etag = 'new-account'; $Fixture.AiAccounts.Add($replacement)
                        }
                    }
                    $Fixture.Mutations.Add([pscustomobject]@{ Name = 'DeleteAiAccount'; Id = $id })
                    return [pscustomobject]@{ StatusCode = 204; Content = '' }
                }
                throw 'Unexpected AI account operation.'
            }
            if ($id -match '/providers/Microsoft\.CognitiveServices/accounts/[^/]+/deployments(?:/[^/]+)?$') {
                if ($Method -eq 'GET') {
                    if ($Fixture.AiReadStatus) { Throw-BoundaryError $Fixture.AiReadStatus }
                    if ($id -like '*/deployments') {
                        $items = @($Fixture.AiDeployments | Where-Object { $_.id.StartsWith($id + '/', [StringComparison]::OrdinalIgnoreCase) })
                        return [pscustomobject]@{ StatusCode = 200; Content = (@{ value = $items } | ConvertTo-Json -Depth 10 -Compress) }
                    }
                    $Fixture.AiDeploymentReads++
                    if ($Fixture.AiPendingDeletionId -eq $id) {
                        if ($Fixture.AiDeletePendingReads -gt 0) { $Fixture.AiDeletePendingReads-- }
                        else {
                            $old = @($Fixture.AiDeployments | Where-Object { $_.id -ieq $id })
                            if ($old.Count) { $null = $Fixture.AiDeployments.Remove($old[0]) }
                            $Fixture.AiPendingDeletionId = ''
                        }
                    }
                    $items = @($Fixture.AiDeployments | Where-Object { $_.id -ieq $id })
                    if (-not $items.Count) { Throw-BoundaryError 404 }
                    if ($Fixture.AiChangeDeploymentOnRead -and $Fixture.AiDeploymentReads -ge $Fixture.AiChangeDeploymentOnRead) {
                        $items[0].sku.capacity = 2; $items[0].etag = 'deployment-changed'
                    }
                    return [pscustomobject]@{ StatusCode = 200; Content = ($items[0] | ConvertTo-Json -Depth 10 -Compress) }
                }
                if ($Method -eq 'DELETE') {
                    if ($Fixture.AiDeleteStatus) { Throw-BoundaryError $Fixture.AiDeleteStatus }
                    $items = @($Fixture.AiDeployments | Where-Object { $_.id -ieq $id })
                    if ($items.Count) {
                        if ($Fixture.AiDeletePendingReads -gt 0) {
                            $Fixture.AiPendingDeletionId = $id
                            $items[0].properties.provisioningState = 'Deleting'
                        }
                        else {
                            $null = $Fixture.AiDeployments.Remove($items[0])
                            if ($Fixture.AiRecreateAfterDelete) {
                                $replacement = $items[0].Clone()
                                $replacement.systemData = @{ createdAt = '2026-02-01T00:00:00Z' }; $replacement.etag = 'recreated'
                                $Fixture.AiDeployments.Add($replacement)
                            }
                        }
                    }
                    $Fixture.Mutations.Add([pscustomobject]@{ Name = 'DeleteAiDeployment'; Id = $id })
                    return [pscustomobject]@{ StatusCode = 204; Content = '' }
                }
                throw 'Unexpected AI deployment method.'
            }
            if ($id -match '/providers/Microsoft\.Web/sites/[^/]+/config/authsettingsV2/list$' -and $Method -eq 'GET') {
                if ($Fixture.AuthReadStatus) { Throw-BoundaryError $Fixture.AuthReadStatus }
                return [pscustomobject]@{ StatusCode = 200; Content = (@{ properties = $Fixture.AuthSettings } | ConvertTo-Json -Depth 15 -Compress) }
            }
            if ($id -match '/providers/Microsoft\.Sql/servers/[^/]+$') {
                if ($Method -eq 'GET') {
                    $admin = $Fixture.SqlAdministrator
                    $properties = @{ publicNetworkAccess = 'Enabled'; state = 'Ready'; administrators = $null }
                    if (-not $Fixture.SqlAdministratorUnknown -and $Path -match '\$expand=administrators/activedirectory') {
                        $properties.administrators = @{
                            principalType = $admin.PrincipalType
                            login = $admin.Login; sid = $admin.ObjectId; tenantId = $admin.TenantId
                        }
                    }
                    return [pscustomobject]@{ StatusCode = 200; Content = (@{ id = $id; properties = $properties } | ConvertTo-Json -Depth 6 -Compress) }
                }
                if ($Method -ne 'PATCH' -or -not $WaitForCompletion) { throw 'Expected completed typed administrator PATCH.' }
                $body = $Payload | ConvertFrom-Json
                if (@($body.properties.PSObject.Properties.Name).Count -ne 1 -or
                    $body.properties.PSObject.Properties.Name -cne 'administrators' -or
                    $body.properties.administrators.PSObject.Properties['azureADOnlyAuthentication']) { Throw-BoundaryError 400 }
                $admin = $body.properties.administrators
                $restoring = $admin.sid -ine $Fixture.PrincipalId
                if ($restoring -and $Fixture.SqlRestoreStatus) { Throw-BoundaryError $Fixture.SqlRestoreStatus }
                Record-SqlAccessPhase
                $Fixture.SqlAdministrator = [pscustomobject]@{
                    AdministratorType = $admin.administratorType; PrincipalType = $admin.principalType
                    Login = $admin.login; ObjectId = $admin.sid; TenantId = $admin.tenantId
                }
                $Fixture.SqlAdministratorPatches.Add($body)
                $Fixture.AccessMutations.Add([pscustomobject]@{ Name = $(if ($restoring) { 'RestoreSqlAdministrator' } else { 'SetSqlAdministrator' }); Id = $id })
                if (-not $restoring -and $Fixture.SqlPatchFailsAfterChange) { Throw-BoundaryError 500 }
                return [pscustomobject]@{ StatusCode = 200; Content = '{}' }
            }
            if ($id -notmatch '/providers/Microsoft\.Authorization/roleAssignments/[0-9a-f-]+$') {
                throw 'Unexpected ARM operation.'
            }
            $existing = @($Fixture.RoleAssignments | Where-Object RoleAssignmentId -eq $id)
            switch ($Method) {
                'GET' {
                    if (-not $existing.Count) { Throw-BoundaryError 404 }
                    $role = $existing[0]
                    return [pscustomobject]@{
                        StatusCode = 200
                        Content = (@{
                            id = $id
                            properties = @{
                                scope = $role.Scope; principalId = $role.ObjectId; roleDefinitionId = $role.RoleDefinitionId
                                description = $role.Description; principalType = 'User'
                            }
                        } | ConvertTo-Json -Depth 6 -Compress)
                    }
                }
                'PUT' {
                    if ($Fixture.RoleGrantStatus) { Throw-BoundaryError $Fixture.RoleGrantStatus }
                    if ($Fixture.ExpectedReceiptPath) {
                        $receipt = Get-Content -LiteralPath $Fixture.ExpectedReceiptPath -Raw | ConvertFrom-Json
                        $Fixture.ReceiptPhasesAtGrant.Add($receipt.Phase)
                    }
                    $body = $Payload | ConvertFrom-Json
                    $principalType = if ($Fixture.ActorKind -eq 'User') { 'User' } else { 'ServicePrincipal' }
                    if ($body.properties.principalType -cne $principalType) { Throw-BoundaryError 400 }
                    $scope = $id.Substring(0, $id.LastIndexOf('/providers/Microsoft.Authorization/roleAssignments/', [StringComparison]::OrdinalIgnoreCase))
                    $Fixture.RoleAssignments.Add([pscustomobject]@{
                        RoleAssignmentId = $id; Scope = $scope; ObjectId = $body.properties.principalId
                        RoleDefinitionId = $body.properties.roleDefinitionId; Description = $body.properties.description; Condition = ''
                    })
                    $Fixture.AccessMutations.Add([pscustomobject]@{ Name = 'Grant'; Id = $id })
                    if ($Fixture.FailAfterRoleGrant) { Throw-BoundaryError 500 }
                    return [pscustomobject]@{ StatusCode = 201; Content = '{}' }
                }
                'DELETE' {
                    if ($Fixture.RoleCleanupStatus) { Throw-BoundaryError $Fixture.RoleCleanupStatus }
                    if ($existing.Count) { $null = $Fixture.RoleAssignments.Remove($existing[0]) }
                    $Fixture.AccessMutations.Add([pscustomobject]@{ Name = 'Revoke'; Id = $id })
                    return [pscustomobject]@{ StatusCode = 204; Content = '' }
                }
                default { throw 'Unexpected ARM method.' }
            }
        }
        'Get-Date' = { $Fixture.Clock }
        'Start-Sleep' = {
            param([double] $Seconds, [double] $Milliseconds)
            $Fixture.Clock = $Fixture.Clock.AddSeconds($Seconds).AddMilliseconds($Milliseconds)
        }
        'Invoke-WebRequest' = {
            [CmdletBinding()]
            param([uri] $Uri, [string] $Method = 'GET', [hashtable] $Headers, [int] $MaximumRedirection,
                [switch] $SkipHttpErrorCheck, [int] $TimeoutSec, [string] $Body, [string] $ContentType)
            Trace-Boundary 'Invoke-WebRequest' $PSBoundParameters
            $Fixture.HttpRequests.Add([pscustomobject]@{
                Method = $Method; Uri = $Uri.AbsoluteUri; Headers = $(if ($null -ne $Headers) { @{} + $Headers } else { @{} })
                MaximumRedirection = $MaximumRedirection; TimeoutSec = $TimeoutSec
            })
            if ($Uri.Host -eq 'graph.microsoft.com') {
                $Fixture.GraphRequests.Add([pscustomobject]@{ Method = $Method; Path = $Uri.PathAndQuery })
                if ($Fixture.GraphReadStatus) { return [pscustomobject]@{ StatusCode = $Fixture.GraphReadStatus; Content = 'SENSITIVE-PROVIDER-BODY'; Headers = @{} } }
                $path = [uri]::UnescapeDataString($Uri.AbsolutePath)
                $apps = @($(if (-not $Fixture.EntraApplicationDeleted) { $Fixture.EntraApplication })) + @($Fixture.OtherEntraApplications)
                $principals = @($(if (-not $Fixture.EntraServicePrincipalDeleted) { $Fixture.EntraServicePrincipal })) + @($Fixture.OtherEntraServicePrincipals)
                $apps = @($apps | Where-Object { $null -ne $_ })
                $principals = @($principals | Where-Object { $null -ne $_ })
                $object = $null
                $collection = ''
                if ($path -eq '/v1.0/applications') {
                    return [pscustomobject]@{ StatusCode = 200; Content = (@{ value = $apps } | ConvertTo-Json -Depth 12 -Compress); Headers = @{} }
                }
                if ($path -eq '/v1.0/servicePrincipals') {
                    return [pscustomobject]@{ StatusCode = 200; Content = (@{ value = $principals } | ConvertTo-Json -Depth 12 -Compress); Headers = @{} }
                }
                if ($path -match "^/v1.0/applications\(appId='([^']+)'\)$") {
                    $matchId = $Matches[1]; $object = @($apps | Where-Object appId -eq $matchId) | Select-Object -First 1; $collection = 'applications'
                }
                elseif ($path -match '^/v1.0/applications/([0-9a-f-]+)$') {
                    $matchId = $Matches[1]; $object = @($apps | Where-Object id -eq $matchId) | Select-Object -First 1; $collection = 'applications'
                    if ($Method -eq 'GET') {
                        $Fixture.GraphApplicationReads++
                        if ($Fixture.GraphChangeApplicationOnRead -and $Fixture.GraphApplicationReads -ge $Fixture.GraphChangeApplicationOnRead -and $null -ne $object) { $object.displayName = 'concurrently changed' }
                    }
                }
                elseif ($path -match "^/v1.0/servicePrincipals\(appId='([^']+)'\)$") {
                    $matchId = $Matches[1]; $object = @($principals | Where-Object appId -eq $matchId) | Select-Object -First 1; $collection = 'servicePrincipals'
                }
                elseif ($path -match '^/v1.0/servicePrincipals/([0-9a-f-]+)$') {
                    $matchId = $Matches[1]; $object = @($principals | Where-Object id -eq $matchId) | Select-Object -First 1; $collection = 'servicePrincipals'
                    if ($Method -eq 'GET') {
                        $Fixture.GraphPrincipalReads++
                        if ($Fixture.GraphChangePrincipalOnRead -and $Fixture.GraphPrincipalReads -ge $Fixture.GraphChangePrincipalOnRead -and $null -ne $object) { $object.displayName = 'concurrently changed' }
                    }
                }
                elseif ($path -match '^/v1.0/directory/deletedItems/([0-9a-f-]+)$') {
                    $matchId = $Matches[1]; $object = @($Fixture.EntraDeletedObjects | Where-Object id -eq $matchId) | Select-Object -First 1; $collection = 'deletedItems'
                }
                elseif ($path -match '^/v1.0/directory/deletedItems/microsoft.graph.(application|servicePrincipal)$') {
                    $type = '#microsoft.graph.' + $Matches[1]
                    return [pscustomobject]@{
                        StatusCode = 200; Content = (@{ value = @($Fixture.EntraDeletedObjects | Where-Object { $_['@odata.type'] -ceq $type }) } | ConvertTo-Json -Depth 12 -Compress); Headers = @{}
                    }
                }
                if (-not $collection) { throw 'Unexpected Graph target.' }
                if ($null -eq $object) { return [pscustomobject]@{ StatusCode = 404; Content = ''; Headers = @{} } }
                if ($Method -eq 'DELETE') {
                    if ($Fixture.GraphWriteStatus) { return [pscustomobject]@{ StatusCode = $Fixture.GraphWriteStatus; Content = 'SENSITIVE-PROVIDER-BODY'; Headers = @{} } }
                    if ($collection -eq 'deletedItems') {
                        $null = $Fixture.EntraDeletedObjects.Remove($object)
                        $Fixture.Mutations.Add([pscustomobject]@{ Name = 'PurgeEntraObject'; Id = $object.id })
                    }
                    else {
                        $deleted = $object.Clone(); $deleted.deletedDateTime = '2026-02-01T00:00:00Z'; $Fixture.EntraDeletedObjects.Add($deleted)
                        if ($collection -eq 'applications') {
                            if ($object.id -eq $Fixture.EntraApplication.id) { $Fixture.EntraApplicationDeleted = $true }
                            else { $null = $Fixture.OtherEntraApplications.Remove($object) }
                            if ($Fixture.EntraAutoDeleteLinkedSp -and $Fixture.EntraServicePrincipal.appId -eq $object.appId -and -not $Fixture.EntraServicePrincipalDeleted) {
                                $Fixture.EntraServicePrincipalDeleted = $true
                                $deletedSp = $Fixture.EntraServicePrincipal.Clone(); $deletedSp.deletedDateTime = '2026-02-01T00:00:00Z'; $Fixture.EntraDeletedObjects.Add($deletedSp)
                            }
                            $Fixture.Mutations.Add([pscustomobject]@{ Name = 'DeleteEntraApplication'; Id = $object.id })
                        }
                        else {
                            if ($object.id -eq $Fixture.EntraServicePrincipal.id) { $Fixture.EntraServicePrincipalDeleted = $true }
                            else { $null = $Fixture.OtherEntraServicePrincipals.Remove($object) }
                            $Fixture.Mutations.Add([pscustomobject]@{ Name = 'DeleteEntraServicePrincipal'; Id = $object.id })
                        }
                    }
                    return [pscustomobject]@{ StatusCode = 204; Content = ''; Headers = @{} }
                }
                if ($Method -ne 'GET') { throw 'Unexpected Graph mutation.' }
                return [pscustomobject]@{ StatusCode = 200; Content = ($object | ConvertTo-Json -Depth 12 -Compress); Headers = @{} }
            }
            if ($Uri.Host -eq 'task-exp.azurewebsites.net') {
                if ($Uri.AbsolutePath -eq '/api/ready') {
                    return [pscustomobject]@{ StatusCode = $Fixture.EasyAuthReadyStatus; Content = 'SENSITIVE-PROVIDER-BODY'; Headers = @{} }
                }
                if ($Uri.AbsolutePath -like '/__arolariu-auth-probe-*') {
                    $status = $Fixture.EasyAuthAnonymousStatus
                    if ($null -ne $Headers -and $Headers.ContainsKey('Authorization')) {
                        $encoded = ($Headers.Authorization -replace '^Bearer ', '').Split('.')[1].Replace('-', '+').Replace('_', '/')
                        $encoded = $encoded.PadRight($encoded.Length + ((4 - $encoded.Length % 4) % 4), '=')
                        $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encoded)) | ConvertFrom-Json
                        $status = if ($claims.aud -notin $Fixture.ApplicationClientId, "api://$($Fixture.ApplicationClientId)") { $Fixture.EasyAuthWrongAudienceStatus }
                            elseif ($Fixture.EasyAuthAllowedPrincipalIds -contains $claims.oid) { $Fixture.EasyAuthAllowedStatus } else { $Fixture.EasyAuthDeniedStatus }
                    }
                    return [pscustomobject]@{ StatusCode = $status; Content = 'SENSITIVE-PROVIDER-BODY'; Headers = @{} }
                }
            }
            if (-not $Fixture.HttpResponses.ContainsKey($Uri.AbsoluteUri)) { throw 'Unexpected HTTP target.' }
            $response = $Fixture.HttpResponses[$Uri.AbsoluteUri]
            if ($response -is [exception]) { throw $response }
            return [pscustomobject]@{
                StatusCode = $response.StatusCode; Content = $response.Content
                Headers = $(if ($response.ContainsKey('Headers')) { $response.Headers } else { @{} })
            }
        }
        'Get-AzSqlServerActiveDirectoryOnlyAuthentication' = {
            [CmdletBinding()] param($ResourceGroupName, $ServerName, $DefaultProfile)
            Trace-Boundary 'Get-AzSqlServerActiveDirectoryOnlyAuthentication' $PSBoundParameters
            [pscustomobject]@{ AzureADOnlyAuthentication = $Fixture.SqlEntraOnly }
        }
        'Get-AzSqlServerFirewallRule' = {
            [CmdletBinding()] param($ResourceGroupName, $ServerName, $FirewallRuleName, $DefaultProfile)
            Trace-Boundary 'Get-AzSqlServerFirewallRule' $PSBoundParameters
            $rules = @($Fixture.SqlFirewallRules | Where-Object { -not $FirewallRuleName -or $_.FirewallRuleName -ceq $FirewallRuleName })
            if ($FirewallRuleName -and -not $rules.Count) { Throw-BoundaryError 404 }
            $rules
        }
        'New-AzSqlServerFirewallRule' = {
            [CmdletBinding(SupportsShouldProcess)] param($ResourceGroupName, $ServerName, $FirewallRuleName, $StartIpAddress, $EndIpAddress, $DefaultProfile)
            Trace-Boundary 'New-AzSqlServerFirewallRule' $PSBoundParameters
            if (-not $PSCmdlet.ShouldProcess($FirewallRuleName, 'Create firewall rule')) { return }
            Record-SqlAccessPhase
            $rule = [pscustomobject]@{ FirewallRuleName = $FirewallRuleName; StartIpAddress = $StartIpAddress; EndIpAddress = $EndIpAddress }
            $Fixture.SqlFirewallRules.Add($rule)
            $Fixture.AccessMutations.Add([pscustomobject]@{ Name = 'AddSqlFirewall'; Id = $FirewallRuleName })
            $rule
        }
        'Remove-AzSqlServerFirewallRule' = {
            [CmdletBinding(SupportsShouldProcess)] param($ResourceGroupName, $ServerName, $FirewallRuleName, $DefaultProfile, [switch] $Force)
            Trace-Boundary 'Remove-AzSqlServerFirewallRule' $PSBoundParameters
            if (-not $PSCmdlet.ShouldProcess($FirewallRuleName, 'Remove firewall rule')) { return }
            if ($Fixture.SqlFirewallRemovalStatus) { Throw-BoundaryError $Fixture.SqlFirewallRemovalStatus }
            $existing = @($Fixture.SqlFirewallRules | Where-Object FirewallRuleName -ceq $FirewallRuleName)
            if ($existing.Count) { $null = $Fixture.SqlFirewallRules.Remove($existing[0]) }
            $Fixture.AccessMutations.Add([pscustomobject]@{ Name = 'RemoveSqlFirewall'; Id = $FirewallRuleName })
        }
        'Invoke-Sqlcmd' = {
            [CmdletBinding()]
            param($ServerInstance, $Database, $AccessToken, $Query, $Encrypt, [switch] $TrustServerCertificate,
                $HostNameInCertificate, $ConnectionTimeout, $QueryTimeout, [switch] $AbortOnError,
                [switch] $DisableVariables, [switch] $DisableCommands, [bool] $OutputSqlErrors)
            Trace-Boundary 'Invoke-Sqlcmd' $PSBoundParameters
            if ($Fixture.SqlRequireFirewall -and -not @($Fixture.SqlFirewallRules | Where-Object {
                $_.StartIpAddress -eq $Fixture.SqlClientIPAddress -and $_.EndIpAddress -eq $Fixture.SqlClientIPAddress
            }).Count) { throw [TaskTestSqlException]::new(40615) }
            if ($Fixture.SqlRequireAdministrator -and $Fixture.SqlAdministrator.ObjectId -ine $Fixture.PrincipalId) {
                throw [TaskTestSqlException]::new(18456)
            }
            if ($Query -match 'AS \[ProbeUserName\]') {
                return [pscustomobject]@{
                    ProbeDatabase = $Database; ProbeUserName = $Fixture.SqlProbeUserName
                    ProbeUserType = $Fixture.SqlProbeUserType; ProbeSid = $Fixture.SqlProbeSid
                }
            }
            if ($Query -match 'AS \[TableExists\]') {
                if ($Query -notmatch "OBJECT_ID\(N'((?:''|[^'])*)'") { throw 'Unexpected table probe.' }
                $table = $Matches[1].Replace("''", "'")
                return [pscustomobject]@{
                    TableExists = $Fixture.SqlRequiredTables -ccontains $table
                    CanSelect = $(if ($Fixture.SqlObjectDenied) { 0 } else { 1 })
                    CanInsert = 1; CanUpdate = 1; CanDelete = 1
                }
            }
            if ($Query -match 'AS \[CanSelect\]') { return [pscustomobject] $Fixture.SqlProbePermissions }
            if ($Query -match 'AS \[CanManage\]') {
                return [pscustomobject]@{ CanManage = $Fixture.SqlCanManage -or $Fixture.SqlAdministrator.ObjectId -ieq $Fixture.PrincipalId }
            }
            if ($Query -match 'AS \[CanInspect\]') {
                return [pscustomobject]@{ CanInspect = $Fixture.SqlCanInspect -or $Fixture.SqlAdministrator.ObjectId -ieq $Fixture.PrincipalId }
            }
            if ($Query -match '^\s*SELECT') {
                if ($Fixture.SqlReadStatus) { Throw-BoundaryError $Fixture.SqlReadStatus }
                $Fixture.SqlReads++
                if ($Query -match 'AS \[IsMember\]') {
                    if ($Query -notmatch "WHERE name = N'((?:''|[^'])*)'") { throw 'Unexpected user lookup.' }
                    $name = $Matches[1].Replace("''", "'")
                    if ($Query -notmatch "DATABASE_PRINCIPAL_ID\(N'(db_datareader|db_datawriter|db_ddladmin)'\)") { throw 'Unexpected role lookup.' }
                    $role = $Matches[1]
                    $users = @($Fixture.Principals | Where-Object Name -ieq $name)
                    if (-not $Fixture.SqlCanInspect -and $Fixture.SqlAdministrator.ObjectId -ine $Fixture.PrincipalId) { $users = @() }
                    $member = @($Fixture.Memberships | Where-Object { $_.User -ceq $name -and $_.Role -ceq $role }).Count -gt 0
                    if ($Fixture.SqlAppearsOnRead -and $Fixture.SqlReads -ge $Fixture.SqlAppearsOnRead) { $member = $true }
                    return [pscustomobject]@{
                        UserName = $(if ($users.Count) { $users[0].Name } else { $null })
                        UserType = $(if ($users.Count) { $users[0].Type } else { $null })
                        RoleName = $(if ($Fixture.Roles -contains $role) { $role } else { $null })
                        IsMember = $member
                    }
                }
                if ($Query -notmatch "WHERE name = N'((?:''|[^'])*)' OR sid = (0x[0-9a-fA-F]{32});") {
                    throw 'Unexpected metadata read.'
                }
                $name = $Matches[1].Replace("''", "'")
                $sid = $Matches[2]
                if ($Fixture.SqlAppearsOnRead -and $Fixture.SqlReads -ge $Fixture.SqlAppearsOnRead) {
                    return [pscustomobject]@{ Name = $name; Type = 'E'; Sid = $sid }
                }
                if (-not $Fixture.SqlCanInspect -and $Fixture.SqlAdministrator.ObjectId -ine $Fixture.PrincipalId) { return @() }
                return $Fixture.Principals | Where-Object { $_.Name -ieq $name -or $_.Sid -ieq $sid }
            }
            if (-not $Fixture.SqlCanManage -and $Fixture.SqlAdministrator.ObjectId -ine $Fixture.PrincipalId) {
                throw [TaskTestSqlException]::new(229)
            }
            if ($Fixture.SqlConcurrentAdministratorChange) {
                $Fixture.SqlAdministrator = [pscustomobject]@{
                    ObjectId = '99999999-9999-4999-8999-999999999999'; PrincipalType = 'Group'
                    Login = 'concurrent administrator'; TenantId = $Fixture.Tenant; AdministratorType = 'ActiveDirectory'
                }
            }
            if ($Query -match '^ALTER ROLE \[(db_datareader|db_datawriter|db_ddladmin)\] ADD MEMBER \[((?:[^\]]|\]\])*)\];$') {
                $role = $Matches[1]
                $name = $Matches[2].Replace(']]', ']')
                if ($Fixture.SqlWriteStatus) { Throw-BoundaryError $Fixture.SqlWriteStatus }
                $Fixture.Memberships.Add([pscustomobject]@{ User = $name; Role = $role })
                if ($Fixture.SqlRoleRace) { Throw-BoundaryError 409 }
                $Fixture.Mutations.Add([pscustomobject]@{ Name = 'AddMembership'; Arguments = $PSBoundParameters })
                return 'SENSITIVE-PROVIDER-BODY'
            }
            if ($Query -notmatch '^CREATE USER \[((?:[^\]]|\]\])*)\] WITH SID = (0x[0-9a-fA-F]{32}), TYPE = E;$') {
                throw 'Unexpected SQL mutation.'
            }
            $name = $Matches[1].Replace(']]', ']')
            $sid = $Matches[2]
            if ($Fixture.SqlWriteStatus) { Throw-BoundaryError $Fixture.SqlWriteStatus }
            $Fixture.Principals.Add([pscustomobject]@{ Name = $name; Type = 'E'; Sid = $sid })
            if ($Fixture.SqlCreateRace) { Throw-BoundaryError 409 }
            $Fixture.Mutations.Add([pscustomobject]@{ Name = 'CreateUser'; Arguments = $PSBoundParameters })
            'SENSITIVE-PROVIDER-BODY'
        }
        'Connect-AzAccount' = { throw 'Forbidden login.' }
        'Set-AzContext' = { throw 'Forbidden context switch.' }
        'Install-Module' = { throw 'Forbidden installation.' }
        'Install-PSResource' = { throw 'Forbidden installation.' }
    }
    $definitions['New-SecretMetadata'] = ${function:New-SecretMetadata}
    $definitions['New-Setting'] = ${function:New-Setting}
    $definitions['New-TestAccessToken'] = ${function:New-TestAccessToken}
    foreach ($entry in $definitions.GetEnumerator()) {
        $state.Commands.Add([Management.Automation.Runspaces.SessionStateFunctionEntry]::new($entry.Key, $entry.Value.ToString()))
    }
    $operator = [TaskTestHost]::new($Fixture.Approve, [string[]] $Fixture.Inputs)
    $runspace = [Management.Automation.Runspaces.RunspaceFactory]::CreateRunspace($operator, $state)
    $powershell = [powershell]::Create()
    try {
        $runspace.Open()
        $powershell.Runspace = $runspace
        $null = $powershell.AddScript({
            param($TaskPath, $TaskParameters, $Preference)
            $PSModuleAutoLoadingPreference = 'None'
            $ConfirmPreference = $Preference
            $PSDefaultParameterValues = $Fixture.DefaultParameterValues
            & $TaskPath @TaskParameters
        }).AddArgument($Path).AddArgument($Parameters).AddArgument($Fixture.ConfirmPreference)
        $failure = ''
        try { $output = @($powershell.Invoke()) } catch { $output = @(); $failure = $_.Exception.Message }
        $errors = @($powershell.Streams.Error | ForEach-Object { $_.ToString() })
        $information = @($powershell.Streams.Information | ForEach-Object { $_.MessageData })
        [pscustomobject]@{
            Output = $output
            ErrorText = ($errors + $failure) -join "`n"
            AllText = (@($output | Out-String) + $errors + $failure + $operator.RecordingUI.Messages +
                @($information | ConvertTo-Json -Depth 8 -Compress)) -join "`n"
            Information = $information
            Prompts = $operator.RecordingUI.Prompts
            Messages = @($operator.RecordingUI.Messages)
        }
    }
    finally {
        $powershell.Dispose()
        $runspace.Dispose()
    }
}
