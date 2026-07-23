# SmartFactoryDB

Database SQL Server của dự án **SmartFactory**.

## Nguồn

| File | Vai trò |
|------|---------|
| `D:\YSData\Database\SmartFactoryDB.sql` | Script gốc (SSMS export) — **nguồn chân lý** |
| `database/SmartFactoryDB.sql` | Bản copy trong repo để deploy/code review |

Tên database trong script: **`SmartFactoryDB`**.

## Cài đặt

```sql
-- Trong SSMS: mở và chạy
D:\YSData\Database\SmartFactoryDB.sql
-- hoặc
D:\YSData\Source\SmartFactory\database\SmartFactoryDB.sql
```

Sau đó tạo file `.env` từ `.env.example` với `DB_DATABASE=SmartFactoryDB`.

## Mapping UI (check-main) ↔ bảng DB

| UI / mock | Bảng / cột SmartFactoryDB |
|-----------|---------------------------|
| Chọn bộ phận | `Zones` (`ZoneId`, `ZoneCode`, `ZoneName`) — **ưu tiên ZoneName** trên Web/Android |
| Danh sách máy | `Machines` (`MachineCode`, `MachineName`) — **ưu tiên MachineName** |
| Tablet / chat | `Users.Username` (`tablet1` → hiển thị `Tablet 1`) — Web chat + Android shell; không dùng `CheckedBy` |
| Ca sáng / đêm + cửa sổ gửi | `Shifts` (`FormOpenTime`, `FormDeadlineTime`, `WorkStartTime`, `WorkEndTime`) |
| Khóa form sau deadline | `ShiftStatus` (`IsFormEnabled`, `LockedAt`) |
| Gửi OK / NG / missed | `DailyChecks.CheckStatus` = `OK` / `NG` / `MISSING` |
| Lý do + ảnh lỗi | `TaskIncidents` (`ErrorDescription`, `IncidentImageUrl`) |
| Chat chỉ thị | `Conversations`, `Messages` (`SourceLang`), `MessageTranslations` |
| Tài khoản admin/tablet | `Users` (`UserType`) |
| Gán tablet theo khu | `UserZoneAssignments` (2 BP / tablet) + `UserMachineAssignments` (10 máy / tablet; mỗi máy 1 tablet) |
| Layout demo | 5 tablet active (`tablet1`–`tablet5`) · 10 bộ phận (`BP1`–`BP10`) · 50 thiết bị (`TB1`–`TB50`) |

## Seed ca (tham khảo — nếu Shifts chưa có data)

```sql
USE SmartFactoryDB;
GO
-- Ca sáng: làm 08:00–18:40 | mở form 07:00 | deadline 08:30
INSERT INTO dbo.Shifts (ShiftCode, ShiftName, WorkStartTime, WorkEndTime, FormOpenTime, FormDeadlineTime)
VALUES
  ('DAY',   N'Ca sáng', '08:00', '18:40', '07:00', '08:30'),
  ('NIGHT', N'Ca đêm',  '20:00', '05:30', '19:00', '20:30');
```
