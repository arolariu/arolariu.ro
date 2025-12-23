-- =====================================================================================
-- SQL Database RBAC Setup for User-Assigned Managed Identities
-- =====================================================================================
-- This script configures database-level permissions for Azure User-Assigned Managed
-- Identities (UAMIs) to enable secure, passwordless authentication to Azure SQL.
--
-- Prerequisites:
-- 1. Azure SQL Server must have Azure AD authentication enabled
-- 2. Azure SQL Server must have a system or user-assigned managed identity
-- 3. The managed identities must exist in Azure AD before running this script
-- 4. Execute this script as an Azure AD admin on the target database
--
-- Assigned Roles:
-- - db_datareader: SELECT permissions on all user tables
-- - db_datawriter: INSERT, UPDATE, DELETE permissions on all user tables
-- - db_ddladmin: DDL operations (CREATE, ALTER, DROP tables/indexes)
--
-- Security Notes:
-- - Uses Azure AD external provider authentication (no passwords stored)
-- - Identities authenticate via managed identity tokens
-- - Follows principle of least privilege for each identity type
--
-- See: backend-uami-rbac.bicep, infrastructure-uami-rbac.bicep for Azure RBAC
-- =====================================================================================

-- =====================================================================================
-- Backend Managed Identity Permissions
-- =====================================================================================
-- The backend API (.NET) requires full data access for CRUD operations and schema
-- migrations. This identity is used by the api.arolariu.ro application.
-- =====================================================================================

-- Create the database user from the Azure AD external provider (managed identity)
CREATE USER [backend] FROM EXTERNAL PROVIDER;

-- Grant read access to all tables for query operations
ALTER ROLE db_datareader ADD MEMBER [backend];

-- Grant write access to all tables for insert/update/delete operations
ALTER ROLE db_datawriter ADD MEMBER [backend];

-- Grant DDL admin for Entity Framework migrations and schema changes
ALTER ROLE db_ddladmin ADD MEMBER [backend];
GO

-- =====================================================================================
-- Infrastructure Managed Identity Permissions
-- =====================================================================================
-- The infrastructure identity (GitHub Actions CI/CD) requires database access for
-- running migrations, seeding data, and deployment verification.
-- =====================================================================================

-- Create the database user from the Azure AD external provider (managed identity)
CREATE USER [infra] FROM EXTERNAL PROVIDER;

-- Grant read access for deployment verification and data validation
ALTER ROLE db_datareader ADD MEMBER [infra];

-- Grant write access for seeding initial data and test data cleanup
ALTER ROLE db_datawriter ADD MEMBER [infra];

-- Grant DDL admin for running database migrations during deployment
ALTER ROLE db_ddladmin ADD MEMBER [infra];
GO
