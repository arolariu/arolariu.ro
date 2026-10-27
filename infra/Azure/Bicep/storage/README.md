# Storage and data services

[deploymentFile.bicep](deploymentFile.bicep) provisions the existing data-service profile. Foundation composes its outputs with
resource-scoped grants, identity-bound SQL bootstrap, backend data-access probes, and resolved application configuration.

| File                                               | Responsibility                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [storageAccount.bicep](storageAccount.bicep)       | Standard LRS StorageV2, private `invoices` blobs, `invoice-analysis` queue, file/table services, CORS, lifecycle/retention. |
| [containerRegistry.bicep](containerRegistry.bicep) | Basic ACR, admin user disabled, managed-identity push/pull.                                                                 |
| [sqlServer.bicep](sqlServer.bicep)                 | SQL server/databases, Entra-only administrator, auditing/firewall and existing backup/tier settings.                        |
| [noSqlServer.bicep](noSqlServer.bicep)             | Cosmos account, `primary` database, invoices/merchants containers, existing partition/index/backup settings.                |

## Connections and access

Storage disables shared-key authentication and blob public access while retaining the current public network, HTTPS/TLS, encryption, CORS,
and lifecycle/retention settings. The existing account is application data storage, never deployment-script backing storage. Storage uses
the approved `2026-06-01` API compatibility exception: stable Bicep 0.48.1 does not recognize the newer September types.

SQL is passwordless and Entra-only; there is no SQL-password fallback. The infrastructure UAMI principal is the permanent server
administrator. Its inline bootstrap creates a backend identity-bound contained user in the application database, grants reader/writer/DDL
memberships, and fails before mutation if an unrelated SID already occupies that user name. The separate backend login probe is required
live evidence; administrator access alone is insufficient. The Azure-services firewall exception is intentional and does not restrict
traffic to this subscription.

Cosmos disables local authentication. The backend receives the native SQL data-contributor role scoped to `/dbs/primary`, not the
management-plane Operator role. Consumers receive the raw `documentEndpoint`, not an invented keyless connection string. Partition, index,
capacity, and backup contracts are unchanged.

The orchestrator forwards Storage name/ID/blob/queue endpoints, ACR name/login server, SQL server/FQDN/database names, and Cosmos
name/endpoint. Foundation uses the backend identity to verify SQL login/memberships, Cosmos metadata/read-only data, blob list, and queue
peek. No test blobs/messages or visibility mutations are required. A denial must not silently broaden access or enable keys.

## Lifecycle boundary

The [configuration bootstrap](../bootstrap/configuration.bicep) populates actual service settings after access checks. No manual SQL grant
script, account-key secret, Azure endpoint patch, schema migration, private endpoint, or Premium registry is part of this fresh deployment
contract.

Use the [deployment guide](../DEPLOYMENT_GUIDE.md) for target/cost approval, live proof, reruns, and exact execution-resource cleanup.
Application data, permanent identities/grants, and protected backups are not bootstrap cleanup targets.
