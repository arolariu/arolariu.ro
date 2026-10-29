# Standalone Azure PowerShell tasks

These PowerShell 7 files perform separate, explicit post-provisioning operations. Normal Bicep provisioning does not invoke them. Each file
is self-contained: copy or host that same file without a repository module, bootstrap context, or implicit initializer.

## Prerequisites and authority

Use an existing authenticated Az context matching the explicit `TenantId` and `SubscriptionId`. Tasks never log in, change contexts, install
modules, provision resources, or grant access to themselves. Supply the least privilege needed to read the selected target and perform the
requested operation. A forbidden or unreadable lookup is an error, not proof of absence.

| Module       | Validated version | Used for                              |
| ------------ | ----------------- | ------------------------------------- |
| Az.Accounts  | 5.5.3             | Existing context                      |
| Az.Resources | 6.7.0             | Scoped resource lookup                |
| Az.KeyVault  | 6.6.1             | Secret metadata and explicit creation |
| Pester       | 6.2.0             | Tests only                            |

Install prerequisites separately using your approved package-management process. No dependency installer runs inside a task.

## Shared interface

Pass `TenantId`, `SubscriptionId`, and either an exact `TargetResourceId` or the task's resource-group/name inputs. Manual name patterns
remain scoped to one exact resource group; multiple candidates require numbered selection, never first-match guessing. Noninteractive calls
require exact names or an exact ID and never prompt.

`-WhatIf` reads scoped state but never writes. Manual changes always require native confirmation, even under an ambient
`ConfirmPreference = 'None'` or a manual `-Confirm:$false`. Automation must explicitly pass both `-NonInteractive` and `-Confirm:$false` for
a write; an ambient preference is not consent. WhatIf does not require mutation consent.

One non-secret result is emitted: `Task`, `Status` (`Changed`, `NoChange`, `WouldChange`, `Declined`), `Changed`, `TargetResourceId`,
`Subject`, and `Fields` (owned field names, never values). A terminating classified error fails `pwsh -File`; SDK objects, secret values,
tokens, and provider error bodies are not emitted. A no-op is not proof of downstream access.

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

## Tests

Tests invoke the real files in isolated runspaces with fake Azure/SQL/operator boundaries, disabled module autoloading, and no developer
Azure credentials. They do not prove live permissions, identity login, propagation, or hosting cleanup.

```powershell
Import-Module Pester -RequiredVersion 6.2.0 -ErrorAction Stop
Invoke-Pester -Path .\Tests\Ensure-KeyVaultSecret.Tests.ps1 -CI -Output Detailed
```

No live Azure or SQL mutation or deploymentScripts deployment is implied by these examples. Hosting is a separately approved operation.
