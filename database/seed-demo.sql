/*
  Seed demo SmartFactoryDB — BP1..BP6 / TB1..TB12
  Cot ten (ZoneName, MachineName, ...) la NVARCHAR.
  Noi dung tieng Viet: chay them  npm run seed:vn  (mssql Unicode).

  sqlcmd -S localhost -C -d SmartFactoryDB -E -i database/seed-demo.sql
*/
USE SmartFactoryDB;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRAN;

DELETE FROM dbo.MessageTranslations;
DELETE FROM dbo.Messages;
DELETE FROM dbo.ConversationParticipants;
DELETE FROM dbo.Conversations;
DELETE FROM dbo.TaskIncidents;
DELETE FROM dbo.DailyChecks;
DELETE FROM dbo.ShiftStatus;
DELETE FROM dbo.UserZoneAssignments;
DELETE FROM dbo.Machines;
DELETE FROM dbo.Zones;

IF NOT EXISTS (SELECT 1 FROM dbo.Shifts WHERE ShiftCode = 'DAY')
BEGIN
  INSERT INTO dbo.Shifts (ShiftCode, ShiftName, WorkStartTime, WorkEndTime, FormOpenTime, FormDeadlineTime)
  VALUES
    ('DAY',   N'Ca sáng', '08:00', '18:40', '07:00', '08:30'),
    ('NIGHT', N'Ca đêm',  '20:00', '05:30', '19:00', '20:30');
END
ELSE
BEGIN
  UPDATE dbo.Shifts SET
    ShiftName = N'Ca sáng',
    WorkStartTime = '08:00', WorkEndTime = '18:40',
    FormOpenTime = '07:00', FormDeadlineTime = '08:30'
  WHERE ShiftCode = 'DAY';

  IF NOT EXISTS (SELECT 1 FROM dbo.Shifts WHERE ShiftCode = 'NIGHT')
    INSERT INTO dbo.Shifts (ShiftCode, ShiftName, WorkStartTime, WorkEndTime, FormOpenTime, FormDeadlineTime)
    VALUES ('NIGHT', N'Ca đêm', '20:00', '05:30', '19:00', '20:30');
  ELSE
    UPDATE dbo.Shifts SET
      ShiftName = N'Ca đêm',
      WorkStartTime = '20:00', WorkEndTime = '05:30',
      FormOpenTime = '19:00', FormDeadlineTime = '20:30'
    WHERE ShiftCode = 'NIGHT';
END

-- Ma BP1..BP6; ten tieng Viet se cap nhat bang seed:vn (NVARCHAR)
INSERT INTO dbo.Zones (ZoneCode, ZoneName) VALUES
  ('BP1', N'Bộ phận 1'),
  ('BP2', N'Bộ phận 2'),
  ('BP3', N'Bộ phận 3'),
  ('BP4', N'Bộ phận 4'),
  ('BP5', N'Bộ phận 5'),
  ('BP6', N'Bộ phận 6');

INSERT INTO dbo.Machines (MachineCode, MachineName, ZoneId, CurrentStatus)
SELECT v.Code, v.Name, z.ZoneId, v.Status
FROM (VALUES
  ('TB1',  N'Thiết bị 1',  'BP1', 'normal'),
  ('TB2',  N'Thiết bị 2',  'BP1', 'error'),
  ('TB3',  N'Thiết bị 3',  'BP2', 'normal'),
  ('TB4',  N'Thiết bị 4',  'BP2', 'error'),
  ('TB5',  N'Thiết bị 5',  'BP3', 'normal'),
  ('TB6',  N'Thiết bị 6',  'BP3', 'normal'),
  ('TB7',  N'Thiết bị 7',  'BP4', 'normal'),
  ('TB8',  N'Thiết bị 8',  'BP4', 'normal'),
  ('TB9',  N'Thiết bị 9',  'BP5', 'normal'),
  ('TB10', N'Thiết bị 10', 'BP5', 'normal'),
  ('TB11', N'Thiết bị 11', 'BP6', 'normal'),
  ('TB12', N'Thiết bị 12', 'BP6', 'normal')
) AS v(Code, Name, ZCode, Status)
INNER JOIN dbo.Zones z ON z.ZoneCode = v.ZCode;

DECLARE @Today DATE = CONVERT(date, GETDATE());
DECLARE @DayShiftId INT = (SELECT ShiftId FROM dbo.Shifts WHERE ShiftCode = 'DAY');
DECLARE @AdminId INT = (SELECT TOP 1 UserId FROM dbo.Users WHERE Username = 'admin');
DECLARE @T1 INT = (SELECT TOP 1 UserId FROM dbo.Users WHERE Username = 'tablet1');
DECLARE @T3 INT = (SELECT TOP 1 UserId FROM dbo.Users WHERE Username = 'tablet3');

IF @DayShiftId IS NOT NULL
BEGIN
  INSERT INTO dbo.ShiftStatus (LogDate, ShiftId, IsFormEnabled, LockedAt)
  VALUES (@Today, @DayShiftId, 1, NULL);
END

DECLARE @M1 INT = (SELECT MachineId FROM dbo.Machines WHERE MachineCode = 'TB1');
DECLARE @M2 INT = (SELECT MachineId FROM dbo.Machines WHERE MachineCode = 'TB2');
DECLARE @M3 INT = (SELECT MachineId FROM dbo.Machines WHERE MachineCode = 'TB3');
DECLARE @M4 INT = (SELECT MachineId FROM dbo.Machines WHERE MachineCode = 'TB4');
DECLARE @M5 INT = (SELECT MachineId FROM dbo.Machines WHERE MachineCode = 'TB5');

DECLARE @C1 BIGINT, @C2 BIGINT, @C3 BIGINT, @C4 BIGINT, @C5 BIGINT;

INSERT INTO dbo.DailyChecks (CheckDate, ShiftId, MachineId, EmployeeId, CheckedBy, CheckStatus, SubmittedAt)
VALUES (@Today, @DayShiftId, @M1, @T1, N'Nguyễn Văn A', 'OK', DATEADD(MINUTE, -40, GETDATE()));
SET @C1 = SCOPE_IDENTITY();

INSERT INTO dbo.DailyChecks (CheckDate, ShiftId, MachineId, EmployeeId, CheckedBy, CheckStatus, SubmittedAt)
VALUES (@Today, @DayShiftId, @M2, @T1, N'Nguyễn Văn A', 'NG', DATEADD(MINUTE, -35, GETDATE()));
SET @C2 = SCOPE_IDENTITY();

INSERT INTO dbo.DailyChecks (CheckDate, ShiftId, MachineId, EmployeeId, CheckedBy, CheckStatus, SubmittedAt)
VALUES (@Today, @DayShiftId, @M3, @T3, N'Trần Văn B', 'OK', DATEADD(MINUTE, -30, GETDATE()));
SET @C3 = SCOPE_IDENTITY();

INSERT INTO dbo.DailyChecks (CheckDate, ShiftId, MachineId, EmployeeId, CheckedBy, CheckStatus, SubmittedAt)
VALUES (@Today, @DayShiftId, @M4, @T3, N'Trần Văn B', 'NG', DATEADD(MINUTE, -25, GETDATE()));
SET @C4 = SCOPE_IDENTITY();

INSERT INTO dbo.DailyChecks (CheckDate, ShiftId, MachineId, EmployeeId, CheckedBy, CheckStatus, SubmittedAt)
VALUES (@Today, @DayShiftId, @M5, NULL, NULL, 'MISSING', DATEADD(MINUTE, -5, GETDATE()));
SET @C5 = SCOPE_IDENTITY();

DECLARE @I2 BIGINT, @I4 BIGINT, @Conv2 BIGINT, @Conv4 BIGINT;

INSERT INTO dbo.TaskIncidents (CheckId, ErrorDescription, IncidentImageUrl, IncidentStatus)
VALUES (@C2, N'TB2 phát hiện tiếng ồn bất thường / rung mạnh khi chạy thử.', N'local://demo/tb2-ng.jpg', 'pending');
SET @I2 = SCOPE_IDENTITY();

INSERT INTO dbo.TaskIncidents (CheckId, ErrorDescription, IncidentImageUrl, IncidentStatus)
VALUES (@C4, N'TB4 đèn báo lỗi HMI nhấp nháy đỏ — nghi ngờ cảm biến.', N'local://demo/tb4-ng.jpg', 'processing');
SET @I4 = SCOPE_IDENTITY();

INSERT INTO dbo.Conversations (IncidentId, IsActive) VALUES (@I2, 1);
SET @Conv2 = SCOPE_IDENTITY();
INSERT INTO dbo.Conversations (IncidentId, IsActive) VALUES (@I4, 1);
SET @Conv4 = SCOPE_IDENTITY();

IF @T1 IS NOT NULL
  INSERT INTO dbo.ConversationParticipants (ConversationId, UserId) VALUES (@Conv2, @T1);
IF @T3 IS NOT NULL
  INSERT INTO dbo.ConversationParticipants (ConversationId, UserId) VALUES (@Conv4, @T3);
IF @AdminId IS NOT NULL
BEGIN
  INSERT INTO dbo.ConversationParticipants (ConversationId, UserId) VALUES (@Conv2, @AdminId);
  INSERT INTO dbo.ConversationParticipants (ConversationId, UserId) VALUES (@Conv4, @AdminId);
END

IF @T1 IS NOT NULL
  INSERT INTO dbo.Messages (ConversationId, SenderId, MessageText, MessageType, CreatedAt)
  VALUES (@Conv2, @T1, N'TB2 có tiếng kêu lạ ở vòng bi, đã dừng máy.', 'text', DATEADD(MINUTE, -34, GETDATE()));

IF @AdminId IS NOT NULL
  INSERT INTO dbo.Messages (ConversationId, SenderId, MessageText, MessageType, CreatedAt)
  VALUES (@Conv2, @AdminId, N'Kiểm tra vòng bi số 2 và chụp thêm ảnh mặt bích.', 'text', DATEADD(MINUTE, -32, GETDATE()));

IF @T3 IS NOT NULL
  INSERT INTO dbo.Messages (ConversationId, SenderId, MessageText, MessageType, CreatedAt)
  VALUES (@Conv4, @T3, N'TB4 HMI báo lỗi cảm biến — đang chờ chỉ thị.', 'text', DATEADD(MINUTE, -24, GETDATE()));

IF @AdminId IS NOT NULL
  INSERT INTO dbo.Messages (ConversationId, SenderId, MessageText, MessageType, CreatedAt)
  VALUES (@Conv4, @AdminId, N'Reset cảm biến, nếu còn lỗi thì đổi module I/O.', 'text', DATEADD(MINUTE, -20, GETDATE()));

COMMIT TRAN;

PRINT 'Seed demo BP1..BP6 / TB1..TB12 OK. Chay them: npm run seed:vn neu can fix Unicode.';
GO

SELECT ZoneCode, ZoneName FROM dbo.Zones ORDER BY ZoneCode;
SELECT MachineCode, MachineName, z.ZoneCode, m.CurrentStatus
FROM dbo.Machines m INNER JOIN dbo.Zones z ON z.ZoneId = m.ZoneId
ORDER BY MachineCode;
GO
