using 'main.bicep'

param resourceGroupName = 'arolariu-rg'
param resourceGroupLocation = 'francecentral'
param resourceGroupAuthor = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'

// Required: Entra ID App Registration client ID for exp.arolariu.ro
// Create via: az ad app create --display-name "exp-arolariu-ro" --identifier-uris "api://exp-arolariu-ro" --sign-in-audience "AzureADMyOrg"
// Then copy the appId value here.
param expEntraAppClientId = '<REPLACE_WITH_APP_REGISTRATION_CLIENT_ID>'
