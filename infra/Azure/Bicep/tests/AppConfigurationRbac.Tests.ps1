BeforeAll {
    $compiler = $env:BICEP_CLI_PATH
    if ([string]::IsNullOrWhiteSpace($compiler) -or -not (Test-Path -LiteralPath $compiler -PathType Leaf)) {
        throw 'Select the existing verified compiler with BICEP_CLI_PATH; this test never installs one.'
    }
    $module = Join-Path $PSScriptRoot '..\rbac\app-configuration-rbac.bicep'
    $artifact = Join-Path $TestDrive 'app-configuration-rbac.json'
    & $compiler build $module --no-restore --outfile $artifact
    if ($LASTEXITCODE -ne 0) { throw 'RBAC module compilation failed.' }
    $template = Get-Content -LiteralPath $artifact -Raw | ConvertFrom-Json -AsHashtable
}

Describe 'Compiled store-scoped data writer grants' {
    It 'BindsActualDataOwnerToTheExpectedStoreAndPrincipal: <Resource>' -ForEach @(
        @{ Resource = 'backendConfigOwner'; Principal = 'backendPrincipalId' },
        @{ Resource = 'infrastructureConfigOwner'; Principal = 'infrastructurePrincipalId' }
    ) {
        $assignment = $template.resources[$Resource]
        $assignment.type | Should -Be 'Microsoft.Authorization/roleAssignments'
        $assignment.scope | Should -Be "[resourceId('Microsoft.AppConfiguration/configurationStores', parameters('appConfigurationName'))]"
        $assignment.properties.principalId | Should -Be "[parameters('$Principal')]"
        $assignment.properties.principalType | Should -Be 'ServicePrincipal'
        $expression = [string] $assignment.properties.roleDefinitionId
        $binding = [regex]::Match($expression, "variables\('([^']+)'\)")
        $binding.Success | Should -BeTrue
        $actualRole = $template.variables[$binding.Groups[1].Value]
        $actualRole | Should -Be '5ae67dd6-50cb-40e7-96ff-dc2bfa4b606b'
    }
}
