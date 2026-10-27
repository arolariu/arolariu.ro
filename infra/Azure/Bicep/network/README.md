# Network module

Networking is split between Foundation preparation and Domains completion. It is not independently ready for public traffic merely because a
Front Door profile or DNS zone exists.

| File                                                                 | Stage and responsibility                                                                                                                |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [deploymentFile.bicep](deploymentFile.bicep)                         | Foundation: compose Front Door preparation and DNS using actual application outputs.                                                    |
| [azureFrontDoor.bicep](azureFrontDoor.bicep)                         | Foundation: Standard profile, custom-rule WAF policy, namespace-derived endpoint, origin group/origin, custom-domain validation tokens. |
| [dnsZone.bicep](dnsZone.bicep)                                       | Foundation: `arolariu.ro`, DNSSEC, apex Front Door alias, application CNAME/verification records, and delegation outputs.               |
| [azureFrontDoorCompletion.bicep](azureFrontDoorCompletion.bicep)     | Domains: route and WAF security-policy associations after public DNS readiness.                                                         |
| [../bootstrap/dns-readiness.bicep](../bootstrap/dns-readiness.bicep) | Domains: bounded, read-only public DNS verification.                                                                                    |

Foundation receives the main site's actual default hostname and the typed `applicationDnsRecords` produced by Sites. It emits Front Door
IDs/hostname plus DNS zone nameservers and current DS records. The endpoint is `<resourcePrefix>-afd-production`, not a globally fixed
`production` endpoint. No placeholder Clerk/Resend targets, DKIM values, or guessed IP addresses are seeded.

The operator publishes the exact emitted NS/current parent DS through the registrar. Domains reads current Azure hostnames, verification
IDs, Front Door validation tokens, and DNSSEC signer records directly; it does not validate stale zone values against themselves. The gate
checks complete NS sets, required current DS (allowing additional rollover DS), application CNAME/TXT, and a valid apex IPv4 A answer.
Resolver errors and DNS-not-ready failures are distinct and bounded.

Front Door Standard retains custom WAF rules; Premium managed rule sets and private-link origins are not provisioned. The route and security
policy are deliberately absent from Foundation and are completed only after the DNS gate. Domains does not write DNS or recreate application
resources.

Use the [fresh deployment guide](../DEPLOYMENT_GUIDE.md) for permissions, registrar handoff, stage commands, release checks, and exact-ID
cleanup verification. Do not repair stage failures with ad hoc DNS, origin, SKU, or TLS mutations.
