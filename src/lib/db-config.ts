/**
 * Cấu hình kết nối SmartFactoryDB (SQL Server).
 * Schema: E:\ysData\db\factory.sql → database SmartFactoryDB
 *
 * Biến môi trường đọc từ .env (xem .env.example).
 * Phần frontend Vite chỉ dùng được VITE_*; kết nối DB thật chạy trên API server.
 */

export const DB_NAME = "SmartFactoryDB";
export const DB_SCRIPT_SOURCE = String.raw`E:\ysData\db\factory.sql`;

export type DbConnectionConfig = {
  server: string;
  database: string;
  user: string;
  password: string;
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
  };
};

export function getDbConfig(): DbConnectionConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    server: env.VITE_DB_SERVER || env.DB_SERVER || "localhost",
    database: env.VITE_DB_DATABASE || env.DB_DATABASE || DB_NAME,
    user: env.VITE_DB_USER || env.DB_USER || "sa",
    password: env.VITE_DB_PASSWORD || env.DB_PASSWORD || "",
    options: {
      encrypt: String(env.VITE_DB_ENCRYPT || env.DB_ENCRYPT || "false") === "true",
      trustServerCertificate:
        String(env.VITE_DB_TRUST_SERVER_CERTIFICATE || env.DB_TRUST_SERVER_CERTIFICATE || "true") ===
        "true",
    },
  };
}

/** Chuỗi kết nối ADO.NET / tedious kiểu SQL Server */
export function buildConnectionString(cfg: DbConnectionConfig = getDbConfig()): string {
  return [
    `Server=${cfg.server}`,
    `Database=${cfg.database}`,
    `User Id=${cfg.user}`,
    `Password=${cfg.password}`,
    `Encrypt=${cfg.options.encrypt}`,
    `TrustServerCertificate=${cfg.options.trustServerCertificate}`,
  ].join(";");
}
