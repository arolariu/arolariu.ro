# AI module

[deploymentFile.bicep](deploymentFile.bicep) provisions the [AI Foundry account/project](aiFoundry.bicep). Foundation explicitly places it
in **Sweden Central**, independently of the regional resource-group profile.

| Setting                        | Contract                                                                   |
| ------------------------------ | -------------------------------------------------------------------------- |
| Account                        | `<resourcePrefix>-ai-foundry`, `AIServices`, S0, system-assigned identity. |
| Project                        | `arolariu-ro`, system-assigned identity.                                   |
| Deployment/model               | `model-router`.                                                            |
| Model format/version           | `OpenAI` / `2025-11-18`.                                                   |
| Deployment SKU/capacity        | `GlobalStandard` / `10`.                                                   |
| Account/project/deployment API | `2026-09-01`, recognized by stable Bicep 0.48.1.                           |

Public network access and key authentication remain enabled for the existing SDK consumers. The actual account key is resolved in its owning
leaf and forwarded only through secure outputs, a secure bootstrap parameter, and a secure environment value. The configuration bootstrap
stores environment-specific CognitiveServicesKey secrets and versionless references; the public `aiResources` object contains only
account/project IDs and endpoint.

[ai-rbac.bicep](../rbac/ai-rbac.bicep) preserves account-scoped Cognitive Services User and Azure AI User assignments for the backend
principal. There is no separate legacy OpenAI account or Machine Learning hub in this graph.

Before deploying, obtain approval for the exact target, model, region, SKU/capacity, and cost. Live quota, model availability, and inference
are not proven by a successful compile. Stop rather than selecting a paid/region/model alternative automatically. Follow the
[fresh deployment guide](../DEPLOYMENT_GUIDE.md) for prerequisites, bootstrap evidence, and post-release inference checks.
