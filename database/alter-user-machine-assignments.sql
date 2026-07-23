/*
  Tablet → máy (mỗi máy chỉ gán 1 tablet).
  sqlcmd -S localhost -C -d SmartFactoryDB -E -i database/alter-user-machine-assignments.sql
*/
USE SmartFactoryDB;
GO

IF OBJECT_ID(N'dbo.UserMachineAssignments', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserMachineAssignments (
    AssignmentId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    UserId INT NOT NULL,
    MachineId INT NOT NULL,
    CONSTRAINT UQ_UserMachineAssignments_Machine UNIQUE (MachineId),
    CONSTRAINT UQ_UserMachineAssignments_User_Machine UNIQUE (UserId, MachineId),
    CONSTRAINT FK_UserMachineAssignments_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_UserMachineAssignments_Machine FOREIGN KEY (MachineId) REFERENCES dbo.Machines(MachineId)
  );
END
GO
