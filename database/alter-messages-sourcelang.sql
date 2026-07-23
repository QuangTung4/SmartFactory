/*
  Thêm Messages.SourceLang — ngôn ngữ lúc soạn tin (vi|en|ko).
  Chạy:
  sqlcmd -S localhost -C -E -i database/alter-messages-sourcelang.sql
*/
USE SmartFactoryDB;
GO

IF COL_LENGTH('dbo.Messages', 'SourceLang') IS NULL
BEGIN
  ALTER TABLE dbo.Messages ADD SourceLang varchar(5) NULL;
  PRINT 'Added Messages.SourceLang';
END
ELSE
  PRINT 'Messages.SourceLang already exists';
GO
