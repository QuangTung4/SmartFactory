# SmartFactory

Hệ thống tin học hóa quản lý việc kiểm tra chất lượng thiết bị trước ca làm việc.

Ứng dụng checklist bảo trì đầu ca (tablet + quản lý). UI kế thừa từ `check-main`, database SQL Server **`SmartFactoryDB`** (script nguồn: `E:\ysData\db\factory.sql`).

## Chạy UI

```bash
cd E:\ysData\source\SmartFactory
npm install
npm run dev
```

Giả lập giờ cửa sổ gửi: `?mockTime=07:30` / `08:31` / `19:15` / `20:31`

## Database

| Mục | Giá trị |
|-----|---------|
| Script gốc | `E:\ysData\db\factory.sql` |
| Bản copy trong repo | [`database/SmartFactoryDB.sql`](database/SmartFactoryDB.sql) |
| Tên DB | `SmartFactoryDB` |
| Server (mặc định) | `localhost` (MSSQL) |

Cấu hình kết nối: copy [`.env.example`](.env.example) → `.env` rồi sửa cho đúng instance.

### Bảng chính (factory.sql)

- `Users` — `admin` / `tablet`
- `Zones` — khu vực (thay cho “bộ phận” trên UI chọn zone)
- `Machines` — thiết bị
- `Shifts` — `WorkStartTime`, `WorkEndTime`, `FormOpenTime`, `FormDeadlineTime`
- `ShiftStatus` — khóa form / compliance ca
- `DailyChecks` — kết quả `OK` / `NG` / `MISSING`
- `TaskIncidents` — lỗi + ảnh khi NG
- `Conversations` / `Messages` — chat theo dõi sửa chữa

Chi tiết mapping UI ↔ DB: [`database/README.md`](database/README.md)

## Stack

- Frontend: React + Vite + Tailwind (tablet-first)
- Backend DB: SQL Server `SmartFactoryDB`
