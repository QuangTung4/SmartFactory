# SmartFactoryDB

Database SQL Server của dự án **SmartFactory**.

## Nguồn

| File | Vai trò |
|------|---------|
| `E:\ysData\db\factory.sql` | Script gốc (SSMS export) — **nguồn chân lý** |
| `database/SmartFactoryDB.sql` | Bản copy trong repo để deploy/code review |

Tên database trong script: **`SmartFactoryDB`**.

## Cài đặt

```sql
-- Trong SSMS: mở và chạy
E:\ysData\db\factory.sql
-- hoặc
E:\ysData\source\SmartFactory\database\SmartFactoryDB.sql
```

Sau đó tạo file `.env` từ `.env.example` với `DB_DATABASE=SmartFactoryDB`.

## Mapping UI (check-main) ↔ bảng DB

| UI / mock | Bảng / cột SmartFactoryDB |
|-----------|---------------------------|
| Chọn bộ phận | `Zones` (`ZoneId`, `ZoneCode`, `ZoneName`) |
| Danh sách máy | `Machines` |
| Ca sáng / đêm + cửa sổ gửi | `Shifts` (`FormOpenTime`, `FormDeadlineTime`, `WorkStartTime`, `WorkEndTime`) |
| Khóa form sau deadline | `ShiftStatus` (`IsFormEnabled`, `LockedAt`) |
| Gửi OK / NG / missed | `DailyChecks.CheckStatus` = `OK` / `NG` / `MISSING` |
| Lý do + ảnh lỗi | `TaskIncidents` (`ErrorDescription`, `IncidentImageUrl`) |
| Chat chỉ thị | `Conversations`, `Messages`, `MessageTranslations` |
| Tài khoản admin/tablet | `Users` (`UserType`) |
| Gán tablet theo khu | `UserZoneAssignments` |

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
