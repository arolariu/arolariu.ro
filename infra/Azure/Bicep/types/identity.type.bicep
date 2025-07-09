@metadata({ type: 'identity', name: 'identity' })
@export()
type identity = {
  name: string
  displayName: string
  resourceId: string // Azure Resource ID
  principalId: string // Azure Principal ID (GUID)
}
