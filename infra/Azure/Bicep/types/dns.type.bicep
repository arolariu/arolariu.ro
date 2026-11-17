metadata description = 'Public DNS record and readiness contracts shared by infrastructure stages.'

@export()
type dnsRecord = {
  name: string
  type: 'A' | 'CNAME' | 'TXT' | 'DS'
  expectedValues: string[]
}

@export()
type dnsReadinessManifest = {
  zoneName: string
  authoritativeNameServers: string[]
  records: dnsRecord[]
}
