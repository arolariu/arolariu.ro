targetScope = 'resourceGroup'
extension 'br:mcr.microsoft.com/bicep/extensions/microsoftgraph/v1.0:0.1.9-preview'

metadata description = 'This template will create security groups for specific access to resources.'
metadata author = 'Alexandru-Razvan Olariu'

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
