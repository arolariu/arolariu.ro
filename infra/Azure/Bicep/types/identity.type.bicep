// =====================================================================================
// Identity User-Defined Type - Managed Identity Reference Schema
// =====================================================================================
// This file defines the standardized schema for passing managed identity information
// between Bicep modules. The identity type encapsulates all properties needed to:
// - Reference a User-Assigned Managed Identity (UAMI) resource
// - Assign RBAC roles to the identity's service principal
// - Configure resources to use the identity for Azure AD authentication
//
// Exported Types:
// - identity: Complete UAMI reference with name, resourceId, and principalId
//
// Usage:
// Import in consuming modules:
//   import { identity } from '../types/identity.type.bicep'
//
// Field Descriptions:
// - name: The Azure resource name of the UAMI
// - displayName: Human-readable description of the identity's purpose
// - resourceId: Full ARM resource ID (used for identity assignment on resources)
// - principalId: Azure AD Object ID / Service Principal ID (used for RBAC)
//
// CRITICAL: The principalId is required for role assignments, while resourceId
// is required when assigning an identity to an Azure resource.
//
// See: identity/userAssignedIdentity.bicep (creates identities matching this schema)
// See: rbac/*.bicep (uses principalId for role assignments)
// =====================================================================================

metadata description = 'Identity user-defined type for managed identity references'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

@metadata({ type: 'identity', name: 'identity' })
@export()
type identity = {
  name: string
  displayName: string
  resourceId: string // Azure Resource ID
  principalId: string // Azure Principal ID (GUID)
}
