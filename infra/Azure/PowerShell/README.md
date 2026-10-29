# Standalone Azure PowerShell tasks

These PowerShell 7 files perform separate, explicit post-provisioning operations. Normal Bicep provisioning does not invoke them. Each file
is self-contained: copy or host that same file without a repository module, bootstrap context, or implicit initializer.

For the complete setting inventory, actor/release order, live-proof limits and selective cleanup, use the
[rebuild and teardown runbook](RUNBOOK.md). Provisioning, bootstrap success and application readiness are distinct.

## Prerequisites and authority

Use an existing authenticated Az context matching the explicit `TenantId` and `SubscriptionId`. Tasks never log in, change contexts, install
modules, or provision a hosting environment. Supply the least privilege needed to read the selected target and perform the requested
operation. Only tasks with the explicitly documented `ManageTemporaryAccess` interface may acquire bounded, owned temporary access. A
forbidden or unreadable lookup is an error, not proof of absence.

| Module              | Validated version | Used for                                              |
| ------------------- | ----------------- | ----------------------------------------------------- |
| Az.Accounts         | 5.5.3             | Existing context                                      |
| Az.Resources        | 6.7.0             | Scoped resource lookup                                |
| Az.KeyVault         | 6.6.1             | Secret metadata and explicit creation                 |
| Az.Sql              | 4.7.0             | Optional owned SQL operator-access lifecycle          |
| Az.AppConfiguration | 2.2.0             | Data-plane key/label reads and conditional writes     |
| SqlServer           | 22.4.5.1          | Encrypted SQL execution with a secure Az access token |
| Pester              | 6.2.0             | Tests only                                            |

Install prerequisites separately using your approved package-management process. No dependency installer runs inside a task.

## Shared interface

ARM mutation tasks take `TenantId`, `SubscriptionId`, and either an exact `TargetResourceId` or the task's resource-group/name inputs.
Directory tasks take explicit tenant scope and actual Graph object/client IDs, not a subscription. Probe signatures are listed below. Manual
name patterns remain scoped to one exact resource group; multiple candidates require numbered selection, never first-match guessing.
Noninteractive calls require exact names or an exact ID and never prompt.

`-WhatIf` reads scoped state but never writes. Manual changes always require native confirmation, even under an ambient
`ConfirmPreference = 'None'` or a manual `-Confirm:$false`. Automation must explicitly pass both `-NonInteractive` and `-Confirm:$false` for
a write; an ambient preference is not consent. WhatIf does not require mutation consent.

PowerShell also inserts `$PSDefaultParameterValues` into bound parameters, without exposing their origin. Automation writes therefore fail
closed when enabled defaults can supply `Confirm`, its `cf` alias, or `NonInteractive`, including wildcard parameter names. Access-managed
tasks also protect `ManageTemporaryAccess` and `ResumeCleanup`. This intentionally also rejects otherwise explicit calls while such defaults
exist, even if a default appears scoped to another command. Disable defaults in a caller-owned child scope; the task never modifies the
caller's dictionary:

```powershell
& {
    $PSDefaultParameterValues = @{ Disabled = $true }
    .\Ensure-SqlRoleMembership.ps1 -TenantId $tenant -SubscriptionId $subscription `
        -TargetResourceId $databaseId -UserName 'backend' -RoleName 'db_datareader' -NonInteractive -Confirm:$false
}
```

One non-secret result is emitted: `Task`, `Status` (`Changed`, `NoChange`, `WouldChange`, `Declined`), `Changed`, `TargetResourceId`,
`Subject`, and `Fields` (owned field names, never values). A terminating classified error fails `pwsh -File`; SDK objects, secret values,
tokens, and provider error bodies are not emitted. A no-op is not proof of downstream access.

### Owned temporary access and recovery

All five mutation tasks additionally accept `ManageTemporaryAccess`, `RecoveryReceiptPath`, `ResumeCleanup`, and a bounded
`AccessPropagationTimeoutSeconds` (120 seconds for the secret task, 900 for configuration, 180 for SQL). The flag is opt-in: existing
authorized callers need no lease. Existing recognized Secrets Officer/Key Vault Administrator assignments are preserved. When needed, the
secret task confirms a Secrets Officer grant for the actual verified principal on the selected vault only, records its preselected
assignment ID and ownership marker before requesting it, waits for metadata access, and removes only that assignment in `finally`. Existing
role-assignment authority must already be present.

The ordinary setter can acquire only App Configuration Data Owner on the selected store. The reference setter can additionally acquire only
Key Vault Reader on its selected source vault; this role reads metadata, not secret contents. Both setters keep conditional ETags, unowned
tags and descriptions, and recheck the active actor because the data-plane module's `DefaultProfile` is nonfunctional. Multiple owned grants
are cleaned independently, including after a failure or a changed active context. App Configuration permissions can take
[up to 15 minutes to propagate](https://learn.microsoft.com/azure/azure-app-configuration/concept-enable-rbac); timeout is a failure with
cleanup, not proof of missing target data.

The caller supplies a **new file in an existing durable directory** for `RecoveryReceiptPath`. It contains safe resource/principal IDs,
phases and cleanup metadata, never secret values or tokens. Do not share a receipt between concurrent invocations, edit its ownership
records, or discard it before verified cleanup. It is not a distributed lock. A process kill or ephemeral host loss can bypass `finally`;
retain the receipt outside an ephemeral deploymentScripts host and reconcile it separately.

```powershell
.\Ensure-KeyVaultSecret.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $vaultId -SecretName 'api-jwt' -ManageTemporaryAccess -RecoveryReceiptPath $receiptPath

# Cleanup only: never creates or updates the secret, and refuses changed assignment ownership.
.\Ensure-KeyVaultSecret.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $vaultId -ResumeCleanup -RecoveryReceiptPath $receiptPath
```

Results add `AccessChanged`, `CleanupStatus` (`NotNeeded` or `Completed`), `TargetStateKnown` and an optional receipt path. `Changed`
describes the business target only: leased inspection can return `NoChange`, `AccessChanged=true`, `CleanupStatus=Completed`. No success
result is emitted if cleanup cannot be verified; `CleanupFailed` identifies the receipt to reconcile. Removing the assignment verifies
controller state, not immediate eviction of cached authorization.

WhatIf never creates a receipt or grants access. Unreadable protected state is `WouldChange`, `TargetStateKnown=false` and deferred fields,
not an absent or verified secret. Structured Information events include only safe actor/scope metadata, never the Az profile or raw claims.
An actual principal that cannot be verified cannot acquire temporary access.

For either setter, use the same access/recovery flags with the selected store's exact `TargetResourceId`. Reference-task recovery reads its
validated source-vault ID from the receipt; `ResumeCleanup` needs no key, label, value, or secret parameters and never rewrites them.

## Preserve or create one secret

[`Ensure-KeyVaultSecret.ps1`](Ensure-KeyVaultSecret.ps1) accepts `SecretName` and optional `[SecureString] SecretValue`. For name lookup,
pass `ResourceGroupName` and `VaultName`. It reads version metadata, preserves the latest usable version without fetching plaintext, and
creates only an absent secret. It never rotates, compares plaintext, repairs disabled/expired/not-yet-valid metadata, recovers, or purges a
deleted secret. An existing usable secret needs no replacement value.

```powershell
# Variables identify an explicitly approved tenant, subscription, and exact vault.
.\Ensure-KeyVaultSecret.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $vaultId -SecretName 'api-jwt' -WhatIf

# Interactive: confirm the change; securely request a value only if creation is needed.
.\Ensure-KeyVaultSecret.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -ResourceGroupName $resourceGroup -VaultName $vaultName -SecretName 'api-jwt'

# Automation: obtain the SecureString through an approved in-memory channel, not literal arguments.
.\Ensure-KeyVaultSecret.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $vaultId -SecretName 'api-jwt' -SecretValue $secureValue -NonInteractive -Confirm:$false
```

Successful sequential reruns return `NoChange` with no new version. **Serialize writers for the same secret.** The cmdlet exposes no atomic
create-if-absent condition: the task rereads immediately before creation, but cannot prevent another writer between read and write. This is
sequential idempotency, not distributed locking.

## Upsert one ordinary configuration value

[`Set-AppConfigurationValue.ps1`](Set-AppConfigurationValue.ps1) accepts `Key`, explicitly supplied `Label`, `Value`, and `ContentType`,
plus optional `Tags`. For name lookup, pass `ResourceGroupName` and `StoreName`. Empty label means no label; empty ordinary values are
valid. Key/label comparisons preserve case, and literal filter characters are escaped.

```powershell
.\Set-AppConfigurationValue.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $storeId -Key 'Feature:Name' -Label '' -Value '' -ContentType '' -WhatIf

.\Set-AppConfigurationValue.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $storeId -Key 'Feature:Name' -Label 'DEVELOPMENT' -Value 'enabled' `
    -ContentType 'text/plain' -Tags @{ owner = 'website' } -NonInteractive -Confirm:$false
```

Only provided tag names are owned; other tags and the description are preserved. Locked or unreadable settings and Key Vault reference types
are refused, never unlocked or flattened. Ordinary values are not emitted; use the reference task for credentials.

Creates use `If-None-Match: *`; updates use the observed ETag. A precondition failure permits one reread: `NoChange` if another writer
already satisfied the request, otherwise `StaleState` without a second write. Rerun to inspect and confirm the new state. The module's
`DefaultProfile` is nonfunctional for data-plane commands; tasks verify the active context, not a pretend context switch.

### Temporary SQL operator access

Both SQL tasks additionally accept optional `ClientIPAddress` and `OperatorLoginName`. Without `ManageTemporaryAccess`, existing SQL
authority is still required. With it, the task verifies catalog visibility and effective write authority first; a sufficient current
infrastructure identity performs no administrator or firewall change.

When needed, a verified user can explicitly lease the selected server's Entra administrator. A typed, known prior administrator is required,
recorded before mutation and restored in `finally` only while the temporary state remains owned. The ARM `2025-01-01` PATCH contains only
the administrator identity/type fields and waits for provider completion. Entra-only enforcement is observed and must remain unchanged; it
is never included in the PATCH or toggled.

A firewall lease is created only after a typed SQL firewall rejection and only for an explicitly supplied exact IPv4 address. No external-IP
discovery, range, `0.0.0.0` Azure-services rule, or public-network-policy change is performed. Existing adequate rules are preserved.
Cleanup restores the administrator before removing the exact owned firewall rule, attempting both even if one fails. Concurrent changes are
preserved and reported as `CleanupFailed`, never overwritten.

**Serialize operator administration on the server.** A temporary administrator replaces the existing one and can temporarily affect its
connections; use a maintenance/bootstrap window. Conflict checks are not a distributed lock. Preserve the receipt for interrupted execution
and cleanup-only recovery, which works without opening the database or repeating user/membership writes:

```powershell
.\Ensure-SqlContainedUser.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $databaseId -UserName 'backend' -ExpectedSid $expectedSid `
    -ManageTemporaryAccess -RecoveryReceiptPath $receiptPath -ClientIPAddress $approvedClientIPv4

.\Ensure-SqlContainedUser.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $databaseId -ResumeCleanup -RecoveryReceiptPath $receiptPath
```

The membership task has the same access/recovery flags. Its allowlisted fixed-role changes require effective `db_owner` authority;
`ALTER ANY ROLE` alone is not sufficient. A valid but visibility-limited catalog result is unknown, not proof that a principal is absent.
Receipts may contain the necessary prior/temporary administrator login metadata; protect them as operator artifacts and never commit them.

## Ensure one explicit SQL contained user

[`Ensure-SqlContainedUser.ps1`](Ensure-SqlContainedUser.ps1) accepts `UserName` (nonempty, at most 128 SQL identifier characters) and
`ExpectedSid` (`0x` plus exactly 32 hex characters). For name lookup, pass `ResourceGroupName`, `ServerName`, and `DatabaseName`. The target
ID must identify a database, never a server or a default database.

```powershell
.\Ensure-SqlContainedUser.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $databaseId -UserName 'backend' -ExpectedSid $expectedSid -WhatIf

.\Ensure-SqlContainedUser.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -ResourceGroupName $resourceGroup -ServerName $sqlServer -DatabaseName $database `
    -UserName 'backend' -ExpectedSid $expectedSid -NonInteractive -Confirm:$false
```

The script validates the actual parent FQDN, obtains the current environment's SQL token from the verified context, and uses encrypted
transport with certificate validation, explicit database, 15-second connection and 30-second query timeouts. SQLCMD commands and variable
expansion are disabled; SQL literals and identifiers are escaped separately.

Only an external user (`TYPE = E`) with the exact expected name/SID/type is a no-op. Conflicting bindings or a SID owned by another user
fail without dropping/remapping anything. No Graph lookup, role grant, business-data query, or hidden client-ID/object-ID conversion occurs.
**The caller owns SID correctness.** Matching catalog metadata is not proof of real managed-identity login; that needs a separately approved
live identity test.

## Ensure one SQL role membership

[`Ensure-SqlRoleMembership.ps1`](Ensure-SqlRoleMembership.ps1) uses the same database targeting and encrypted connection contract. Pass an
existing `UserName` and one `RoleName`: `db_datareader`, `db_datawriter`, or `db_ddladmin`.

```powershell
.\Ensure-SqlRoleMembership.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $databaseId -UserName 'backend' -RoleName 'db_datareader' -WhatIf

.\Ensure-SqlRoleMembership.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $databaseId -UserName 'backend' -RoleName 'db_datareader' -NonInteractive -Confirm:$false
```

An existing membership is `NoChange`; otherwise exactly one membership is added and verified. Both principals must exist. All unrelated
memberships are preserved. No user/role creation, nested role/group membership, revocation, `db_owner`, custom role, or broader substitute
grant is supported. A concurrent matching membership is a no-op, not another grant.

## Upsert one validated Key Vault reference

[`Set-AppConfigurationKeyVaultReference.ps1`](Set-AppConfigurationKeyVaultReference.ps1) accepts `Key`, explicitly supplied `Label`,
`VaultResourceId`, `SecretName`, and optional `Tags`. Store name lookup uses `ResourceGroupName` and `StoreName`. There is no arbitrary
plaintext `Value` parameter.

```powershell
.\Set-AppConfigurationKeyVaultReference.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $storeId -Key 'Auth:JWT:Secret' -Label 'PRODUCTION' `
    -VaultResourceId $vaultId -SecretName 'api-jwt' -WhatIf

.\Set-AppConfigurationKeyVaultReference.ps1 -TenantId $tenant -SubscriptionId $subscription `
    -TargetResourceId $storeId -Key 'Auth:JWT:Secret' -Label 'PRODUCTION' `
    -VaultResourceId $vaultId -SecretName 'api-jwt' -NonInteractive -Confirm:$false
```

Both destination and source are confirmed. The task validates the actual vault URI and latest usable source-secret metadata, never reads
plaintext, and writes a versionless URI with content type `application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8`. Equivalent
typed references are no-ops; unrelated keys/tags and descriptions remain untouched. Conditional-write rules match the ordinary setter. A
missing, disabled, expired, or forbidden source fails instead of creating a dangling reference or secret. Source validation is an
observation, not a cross-service transaction or a guarantee against later secret deletion.

## Read-only identity-specific probes

These files never grant tested permissions, repair policy, use account keys, change identity or create a host. They require a genuinely
existing matching actor; a client-ID argument cannot impersonate it. WhatIf returns `WouldRun` without token acquisition or data/auth
requests. Successful executed checks return `Verified`, `Changed=false` and a `Checks` map; failed required assertions terminate.
Unavailable optional negative/schema proof remains `NotVerified`, never green by inference.

| File                                                             | Explicit target/expectation                                                                                                 | Proof and limits                                                                                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [Test-CosmosDataAccess.ps1](Test-CosmosDataAccess.ps1)           | Tenant/subscription, expected principal, account resource ID/endpoint, database/container                                   | AAD account/database/container/partition metadata only; AzureCloud contract; no documents/CRUD claim               |
| [Test-SqlDataAccess.ps1](Test-SqlDataAccess.ps1)                 | Tenant/subscription, expected principal/client, database resource ID/FQDN/name/user; optional required tables               | Actual external-user/client-GUID SID, effective database and supplied-object permissions; no schema initialization |
| [Test-EasyAuthConfiguration.ps1](Test-EasyAuthConfiguration.ps1) | Tenant/subscription, site ID, expected registration client ID and caller object IDs                                         | ARM/Graph config and linkage only; unsafe admin exclusions fail; runtime access stays unverified                   |
| [Test-EasyAuthAccess.ps1](Test-EasyAuthAccess.ps1)               | Tenant, expected current principal, approved service URI/client ID, Allowed or Denied; optional secure wrong-audience token | Ready host, anonymous rejection and protected nonexistent-path status; no secret response or redirects             |

Auth negative tokens are forwarded only when current matching-context v2 metadata and the Entra RSA signature are verified using fixed
tenant-specific HTTPS keys. No unrelated powerful token is acquired implicitly. See the
[actor-specific invocations](RUNBOOK.md#8-obtain-actual-identity-specific-proof).

## Separate deletion and permanent-purge tasks

Every file operates on one selected object, with its own discovery, context, consent and reread guards. Automation needs exact IDs (or the
exact supported ARM tuple), expected application client ID for directory objects, `NonInteractive`, and `Confirm:false`. Permanent purge
also requires `AcknowledgePermanentDeletion` matching the exact selected canonical resource/object ID. Session defaults, including wildcard
acknowledgement defaults, cannot authorize it. WhatIf/decline never deletes.

| File                                                                               | Operation                                            | Preserved/rejected boundaries                                                      |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Remove-AiDeployment.ps1](Remove-AiDeployment.ps1)                                 | One account's selected model deployment              | Other deployments/account; actual model/SKU/capacity shown                         |
| [Remove-AiAccount.ps1](Remove-AiAccount.ps1)                                       | One empty active Cognitive Services AI account       | Remaining deployments block; no purge/recovery/cascade                             |
| [Remove-DeletedAiAccount.ps1](Remove-DeletedAiAccount.ps1)                         | One retained record at original region/group         | Group need not exist; active/recovered account rejected; no broad purge-role grant |
| [Remove-EntraApplication.ps1](Remove-EntraApplication.ps1)                         | One home-tenant registration soft-delete             | Linked-SP effects observed, not implicitly purged                                  |
| [Remove-EntraServicePrincipal.ps1](Remove-EntraServicePrincipal.ps1)               | One eligible application principal                   | Registration preserved; backing MI/foreign/first-party/gallery rejected            |
| [Remove-DeletedEntraApplication.ps1](Remove-DeletedEntraApplication.ps1)           | One typed deleted application permanent purge        | Live/recovered, foreign/mismatched and other deleted types rejected                |
| [Remove-DeletedEntraServicePrincipal.ps1](Remove-DeletedEntraServicePrincipal.ps1) | One typed eligible deleted principal permanent purge | Registration, new principals and unrelated deleted items preserved                 |

AI management uses native Az.Accounts REST with the documented `2024-10-01` inventory/delete shape; the inspected installed
CognitiveServices object drops modern SKU metadata. This does not change Bicep provisioning versions. Graph calls use v1.0 and selected
non-credential properties, with existing authority only. No global Force, subscription elevation, tenant consent or automatic recreation is
provided. Observable state/actor/generation changes stop a destructive call; serialize lifecycle writers. See the
[independent lifecycle invocations](RUNBOOK.md#9-selectively-delete-or-permanently-purge).

## Manual and deploymentScripts hosting

The canonical files above work with explicit parameters in either host. For a terminal invocation, use PowerShell 7 and an already selected
matching context. Name patterns such as `-VaultName 'project-*'` are manual-only: select a numbered candidate and separately confirm a
needed change. Every WhatIf example above is also a manual preview: remove only `-WhatIf` to run the same call interactively and confirm a
needed change. An already satisfied task emits, for example:

```text
Task             : Ensure-KeyVaultSecret
Status           : NoChange
Changed          : False
TargetResourceId : <the exact resolved vault ID>
Subject          : api-jwt
Fields           : {SecretValue}
```

`ContextMismatch`, `PrerequisiteMissing`, `TargetScope`, `SecretReadFailed`, `SecretUnusable`, and `StaleState` are terminating failures.
Supply the intended context/prerequisites or inspect the exact conflicting state; tasks never widen scope, install, rotate, or silently
retry a different target to recover.

### Non-executed standalone deploymentScripts example

This is **hosting documentation only**, not a deployed adapter or an addition to main Bicep. An explicitly approved standalone host must
stage the unchanged canonical file, for example through `supportingScriptUris` from an approved immutable artifact. Pin/verify artifact
integrity and provide the declared modules in the host before invocation; selecting an Az image alone is not proof that its App
Configuration data-plane commands or SqlServer module are present.

The deploymentScripts service authenticates an explicitly configured user-assigned managed identity before running Azure PowerShell. That
identity/context still needs the exact target permissions and matching tenant/subscription. The task itself does not log in. An optional
value must enter through an environment variable defined with `secureValue`, **never** plaintext command-line arguments, outputs, or logs.
The following thin `scriptContent` wrapper invokes the same secret file:

```powershell
# Example only: stage Ensure-KeyVaultSecret.ps1 beside this wrapper.
$ErrorActionPreference = 'Stop'
$PSDefaultParameterValues = @{ Disabled = $true }
$secureValue = $null
try {
    $call = @{
        TenantId = [guid] $env:TASK_TENANT_ID
        SubscriptionId = [guid] $env:TASK_SUBSCRIPTION_ID
        TargetResourceId = $env:TASK_VAULT_RESOURCE_ID
        SecretName = $env:TASK_SECRET_NAME
        NonInteractive = $true
        Confirm = $false
    }
    if ($env:TASK_NEW_SECRET_VALUE) {
        $secureValue = ConvertTo-SecureString $env:TASK_NEW_SECRET_VALUE -AsPlainText -Force
        $call.SecretValue = $secureValue
    }
    [Environment]::SetEnvironmentVariable('TASK_NEW_SECRET_VALUE', $null, 'Process')
    $result = & (Join-Path $PSScriptRoot 'Ensure-KeyVaultSecret.ps1') @call
    $DeploymentScriptOutputs = @{ result = $result }
}
finally {
    [Environment]::SetEnvironmentVariable('TASK_NEW_SECRET_VALUE', $null, 'Process')
    if ($null -ne $secureValue) { $secureValue.Dispose() }
}
```

For other mutation files, change only the canonical filename and explicit parameter map. Keep `NonInteractive = $true` and
`Confirm = $false`; permanent purges additionally require their exact acknowledgement. Probes have their own read-only signatures. Do not
embed copied implementations, infer missing targets, install dependencies, or assume Cloud Shell can inject an arbitrary MI. If access
management is enabled, preserve its receipt outside the ephemeral host before relying on cleanup-only recovery.

A separately approved deploymentScripts resource must use `cleanupPreference: 'Always'` and minimum script-record retention
`retentionInterval: 'PT1H'`. Its owner must observe the exact execution ID, record the actual provider ACI/backing-storage IDs, and verify
their deletion after both controlled success and failure, plus eventual script-record expiry. Configuration is not deletion evidence. Never
delete application storage, permanent identities, resource groups, or arbitrary prefix matches as task cleanup. No live hosting, identity
login, or cleanup proof was performed for this delivery.

References:
[deploymentScripts identity and hosting](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-script-bicep),
[supporting scripts, secure environment variables, and cleanup](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-script-develop),
[App Configuration conditional writes](https://learn.microsoft.com/en-us/azure/azure-app-configuration/rest-api-key-value).

## Tests

Tests invoke the real files in isolated runspaces with fake Azure/SQL/operator boundaries, disabled module autoloading, and no developer
Azure credentials. The cross-owner consent suite covers session defaults, aliases, wildcard patterns, script scoping, manual confirmation,
WhatIf, and explicit calls with disabled defaults. Tests do not prove live permissions, identity login, propagation, or hosting cleanup. Run
from this directory (`infra\Azure\PowerShell`):

```powershell
Import-Module Pester -RequiredVersion 6.2.0 -ErrorAction Stop
Invoke-Pester -Path .\Tests -CI -Output Detailed
```

No live Azure or SQL mutation or deploymentScripts deployment is implied by these examples. Hosting is a separately approved operation.
