# Báo cáo tiến độ — SmartFactory

Theo tài liệu: *Báo Cáo Tiến Độ Dự Án - Smart Factory Check & Chat* (22/07/2026)

## Phân tách sản phẩm

| Thành phần | Trạng thái | Ghi chú |
|------------|------------|---------|
| **Webapp Quản lý** (PC Browser) | Đang ưu tiên hoàn thiện | Entry: `/login` → `/manager` |
| **Android App** (Tablet công nhân) | Để sau | Prototype web cũ nằm `src/tablet/` (không mount route) |
| Backend Node + Socket.IO + SQL Server | Tiếp theo | `E:\ysData\db\factory.sql` |

## Đã xong — Webapp Quản lý

| Hạng mục | Trạng thái |
|----------|------------|
| Module `src/manager/` (layout + Control Room) | Done |
| 4 KPI · Incident panel · Chat · Dịch VI/KO/EN | Done |
| Xác nhận sửa xong (khóa chat) | Done |
| Login admin-only trên web | Done |
| Guard `/manager` theo UserType admin | Done |

### Cách dùng

```bash
cd E:\ysData\source\SmartFactory
npm run dev
```

1. Mở http://localhost:8080/ → `/login`
2. `admin` / `123456`
3. Vào Phòng điều hành `/manager`

## Tạm gác — Tablet → Android

Mã tham chiếu (không chạy trên web):

- `src/tablet/pages/` — Zone · Dashboard · Checklist
- `src/tablet/components/AppShell.tsx`
- Seed `tablet1`…`tablet10` vẫn trong `auth-store` (dùng khi làm Android / API)

## DB demo (đã nạp)

| Entity | Mã |
|--------|-----|
| Bộ phận | `BP1` … `BP6` |
| Thiết bị | `TB1` … `TB12` (2 máy / BP) |
| Users | `admin` + `tablet1`…`tablet10` / `123456` |
| Checks hôm nay | OK×2, NG×2 (TB2/TB4), MISSING×1 (TB5) |

Seed: `database/seed-demo.sql` + `adr_Smart_factory/server` → `npm run seed`  
API: `http://localhost:3001` — thêm `/api/manager/kpis`, `/api/manager/incidents`, chat, resolve

## Tiếp theo (ưu tiên Quản lý)

1. Gắn web Quản lý → REST API (bỏ localStorage mock)
2. Socket.IO real-time KPI / chat
3. API dịch thật (Papago / Google Translate + glossary)
4. Sau đó: Android app từ prototype `src/tablet/`
