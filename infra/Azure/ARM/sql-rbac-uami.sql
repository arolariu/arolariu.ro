-- This script is used to set up RBAC for a SQL database in Azure using a User Assigned Managed Identity (UAMI).

-- Grant the necessary permissions to the Backend User Assigned Managed Identity
CREATE USER [backend] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [backend];
ALTER ROLE db_datawriter ADD MEMBER [backend];
ALTER ROLE db_ddladmin ADD MEMBER [backend];
GO

-- Grant the necessary permissions to the Infrastructure User Assigned Managed Identity
CREATE USER [infra] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [infra];
ALTER ROLE db_datawriter ADD MEMBER [infra];
ALTER ROLE db_ddladmin ADD MEMBER [infra];
GO
