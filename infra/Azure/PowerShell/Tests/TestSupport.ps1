if (-not ('TaskTestHost' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Management.Automation;
using System.Management.Automation.Host;
using System.Security;

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
    [pscustomobject]@{
        Tenant = $tenant
        Subscription = $subscription
        VaultId = $vaultId
        StoreId = $storeId
        Context = [pscustomobject]@{
            Tenant = [pscustomobject]@{ Id = $tenant }
            Subscription = [pscustomobject]@{ Id = $subscription }
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
        })
        SecretVersions = @()
        RemovedSecrets = @()
        SecretReads = 0
        SecretAppearsOnRead = 0
        ResourceReadStatus = 0
        SecretReadStatus = 0
        SecretWriteStatus = 0
        Settings = [Collections.Generic.List[object]]::new()
        AppReadStatus = 0
        AppWriteStatus = 0
        AppConflictSatisfies = $false
        Calls = [Collections.Generic.List[object]]::new()
        Mutations = [Collections.Generic.List[object]]::new()
        Approve = $false
        Inputs = @()
        ConfirmPreference = 'None'
    }
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
            if ($Fixture.SecretReadStatus) { Throw-BoundaryError $Fixture.SecretReadStatus }
            if ($InRemovedState) { return $Fixture.RemovedSecrets }
            if (-not $IncludeVersions) { throw 'Tests forbid retrieving secret material.' }
            $Fixture.SecretReads++
            if ($Fixture.SecretAppearsOnRead -and $Fixture.SecretReads -ge $Fixture.SecretAppearsOnRead) {
                return New-SecretMetadata -Name $Name
            }
            $Fixture.SecretVersions
        }
        'Set-AzKeyVaultSecret' = {
            [CmdletBinding(SupportsShouldProcess)] param($VaultName, $Name, [securestring] $SecretValue, $DefaultProfile)
            Trace-Boundary 'Set-AzKeyVaultSecret' $PSBoundParameters
            if ($Fixture.SecretWriteStatus) { Throw-BoundaryError $Fixture.SecretWriteStatus }
            $Fixture.Mutations.Add([pscustomobject]@{ Name = 'SetSecret'; Arguments = $PSBoundParameters })
            $Fixture.SecretVersions = @(New-SecretMetadata -Name $Name)
            [pscustomobject]@{ SecretValueText = 'SENSITIVE-PROVIDER-BODY'; SecretValue = $SecretValue }
        }
        'Get-AzAppConfigurationKeyValue' = {
            [CmdletBinding()] param($Endpoint, $Key, $Label, $After)
            Trace-Boundary 'Get-AzAppConfigurationKeyValue' $PSBoundParameters
            if ($Fixture.AppReadStatus) { Throw-BoundaryError $Fixture.AppReadStatus }
            $literalKey = [regex]::Replace($Key, '\\([\\*,])', '$1')
            $literalLabel = if ($Label -eq [string][char] 0) { '' } else { [regex]::Replace($Label, '\\([\\*,])', '$1') }
            $Fixture.Settings | Where-Object { $_.Key -ceq $literalKey -and [string] $_.Label -ceq $literalLabel }
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
        'Connect-AzAccount' = { throw 'Forbidden login.' }
        'Set-AzContext' = { throw 'Forbidden context switch.' }
        'Install-Module' = { throw 'Forbidden installation.' }
        'Install-PSResource' = { throw 'Forbidden installation.' }
    }
    $definitions['New-SecretMetadata'] = ${function:New-SecretMetadata}
    $definitions['New-Setting'] = ${function:New-Setting}
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
            & $TaskPath @TaskParameters
        }).AddArgument($Path).AddArgument($Parameters).AddArgument($Fixture.ConfirmPreference)
        $failure = ''
        try { $output = @($powershell.Invoke()) } catch { $output = @(); $failure = $_.Exception.Message }
        $errors = @($powershell.Streams.Error | ForEach-Object { $_.ToString() })
        [pscustomobject]@{
            Output = $output
            ErrorText = ($errors + $failure) -join "`n"
            AllText = (@($output | Out-String) + $errors + $failure + $operator.RecordingUI.Messages) -join "`n"
            Prompts = $operator.RecordingUI.Prompts
            Messages = @($operator.RecordingUI.Messages)
        }
    }
    finally {
        $powershell.Dispose()
        $runspace.Dispose()
    }
}
