targetScope = 'resourceGroup'
extension 'br:mcr.microsoft.com/bicep/extensions/microsoftgraph/v1.0:0.1.9-preview'

// =====================================================================================
// Azure AD Security Groups for Just-In-Time (JIT) Access
// =====================================================================================
// This module creates Microsoft Entra ID (Azure AD) security groups for managing
// Just-In-Time (JIT) access to Azure resources. JIT access reduces attack surface
// by granting time-limited elevated permissions only when needed.
//
// Created Security Groups:
// 1. arolariu-JIT-Users - For human users requiring elevated access
//    - Used for Azure Portal access elevation
//    - Members receive time-limited admin access when approved
//
// 2. arolariu-JIT-Apps - For applications requiring elevated access
//    - Used for service principal access elevation
//    - Enables temporary elevated permissions for automation
//
// Note: This module uses the Microsoft Graph Bicep extension to create
// Azure AD resources directly from Bicep templates.
//
// See: https://learn.microsoft.com/azure/active-directory/privileged-identity-management/
// =====================================================================================

metadata description = 'Creates Azure AD security groups for Just-In-Time (JIT) access management.'
metadata author = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'
metadata version = '2.0.0'

// Security group for human users requiring JIT elevated access
resource securityGroupForUsers 'Microsoft.Graph/groups@v1.0' = {
  displayName: 'arolariu-JIT-Users'
  mailEnabled: false
  mailNickname: 'arolariu-JIT-Users'
  securityEnabled: true
  uniqueName: 'arolariu-JIT-Users'
  description: 'Security group for Just-In-Time access to resources, for users.'
}

resource securityGroupForApps 'Microsoft.Graph/groups@v1.0' = {
  displayName: 'arolariu-JIT-Apps'
  mailEnabled: false
  mailNickname: 'arolariu-JIT-Apps'
  securityEnabled: true
  uniqueName: 'arolariu-JIT-Apps'
  description: 'Security group for Just-In-Time access to resources, for apps.'
}
