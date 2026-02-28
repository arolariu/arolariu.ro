using 'main.bicep'

param resourceGroupName = 'arolariu-rg'
param resourceGroupLocation = 'francecentral'
param resourceGroupAuthor = 'Alexandru-Razvan Olariu <admin@arolariu.ro>'

// Required: Entra ID App Registration client ID for experiments.arolariu.ro
// Create via: az ad app create --display-name "experiments-arolariu-ro" --identifier-uris "api://experiments-arolariu-ro" --sign-in-audience "AzureADMyOrg"
// Then copy the appId value here.
param experimentsEntraAppClientId = '<REPLACE_WITH_APP_REGISTRATION_CLIENT_ID>'
