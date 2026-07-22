/*
  Dam bao cac cot chu hien thi dung NVARCHAR (tieng Viet).
  Ma code (BP1, TB1, OK/NG...) giu VARCHAR.

  sqlcmd -S localhost -C -E -d SmartFactoryDB -i database/alter-nvarchar-text.sql
*/
USE SmartFactoryDB;
GO

-- URL anh su co co the chua ky tu Unicode
IF EXISTS (
  SELECT 1 FROM sys.columns c
  INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
  WHERE c.object_id = OBJECT_ID(N'dbo.TaskIncidents')
    AND c.name = N'IncidentImageUrl'
    AND t.name = N'varchar'
)
BEGIN
  ALTER TABLE dbo.TaskIncidents ALTER COLUMN IncidentImageUrl nvarchar(500) NOT NULL;
  PRINT 'TaskIncidents.IncidentImageUrl -> nvarchar(500)';
END
GO

-- Username: giu VARCHAR (ma admin/tablet1...). Neu can NVARCHAR:
-- DROP INDEX / UNIQUE tren Username roi ALTER COLUMN.
/*
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Users') AND type = 'UQ')
BEGIN
  DECLARE @uq sysname = (SELECT TOP 1 name FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Users') AND type = 'UQ' AND COL_NAME(parent_object_id, unique_index_id) IS NOT NULL);
END
*/
PRINT 'Users.Username giu varchar (ma thiet bi ASCII).';
GO

PRINT 'Text columns ready for Vietnamese (NVARCHAR).';
PRINT 'ZoneName / MachineName / ShiftName / CheckedBy / ErrorDescription / MessageText / TranslatedText da la nvarchar.';
GO

SELECT
  OBJECT_NAME(c.object_id) AS TableName,
  c.name AS ColumnName,
  t.name AS TypeName,
  c.max_length
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id IN (
  OBJECT_ID(N'dbo.Zones'),
  OBJECT_ID(N'dbo.Machines'),
  OBJECT_ID(N'dbo.Shifts'),
  OBJECT_ID(N'dbo.DailyChecks'),
  OBJECT_ID(N'dbo.TaskIncidents'),
  OBJECT_ID(N'dbo.Messages'),
  OBJECT_ID(N'dbo.MessageTranslations'),
  OBJECT_ID(N'dbo.Users')
)
AND t.name IN (N'nvarchar', N'varchar')
ORDER BY TableName, ColumnName;
GO
