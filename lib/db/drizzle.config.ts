import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import path from "path";

// Load .env before reading DATABASE_URL
function loadEnv() {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), "../../../.env"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    for (const raw of readFileSync(p, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const eqIdx = line.indexOf("=");
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      )
        val = val.slice(1, -1);
      process.env[key] = val;
    }
    break;
  }
}
loadEnv();

const url = process.env.DATABASE_URL || "";
const isMysql = url.startsWith("mysql://") || url.startsWith("mysql2://");

if (!url) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export default isMysql
  ? {
      schema: path.join(__dirname, "./src/schema/mysql.ts"),
      dialect: "mysql" as const,
      dbCredentials: { url },
    }
  : {
      schema: path.join(__dirname, "./src/schema/pg.ts"),
      dialect: "postgresql" as const,
      dbCredentials: { url },
    };
