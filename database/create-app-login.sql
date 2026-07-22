/*
  Tạo SQL login cho API (không cần mật khẩu sa của máy).
  Chạy bằng Windows auth:
  sqlcmd -S localhost -C -E -i database/create-app-login.sql
*/
USE [master];
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'smartfactory_app')
BEGIN
  CREATE LOGIN [smartfactory_app] WITH PASSWORD = N'SmartFactory@2026', CHECK_POLICY = OFF;
END
GO

USE [SmartFactoryDB];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'smartfactory_app')
BEGIN
  CREATE USER [smartfactory_app] FOR LOGIN [smartfactory_app];
END
GO

ALTER ROLE db_datareader ADD MEMBER [smartfactory_app];
ALTER ROLE db_datawriter ADD MEMBER [smartfactory_app];
GO

PRINT 'Login smartfactory_app ready.';
GO
