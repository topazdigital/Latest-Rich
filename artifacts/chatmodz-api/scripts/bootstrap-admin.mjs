import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { createPool } from "mysql2/promise";

const databaseUrl = process.env.CHATMODZ_DATABASE_URL;
const email = String(process.env.CHATMODZ_ADMIN_EMAIL || "").trim().toLowerCase();
const name = String(process.env.CHATMODZ_ADMIN_NAME || "Chatmodz Administrator").trim();
const password = process.env.CHATMODZ_ADMIN_PASSWORD;

if (!databaseUrl) throw new Error("CHATMODZ_DATABASE_URL is required");
if (!email || !email.includes("@")) throw new Error("CHATMODZ_ADMIN_EMAIL must be a valid email");
if (!password || password.length < 10) throw new Error("CHATMODZ_ADMIN_PASSWORD must be at least 10 characters");

const pool = createPool({ uri: databaseUrl, waitForConnections: true, connectionLimit: 2, charset: "utf8mb4" });
try {
  const [existing] = await pool.execute("SELECT id FROM operators LIMIT 1");
  if (existing.length) throw new Error("Chatmodz already has an operator; refusing to overwrite existing accounts");

  const passwordHash = await bcrypt.hash(password, 12);
  const publicId = crypto.randomBytes(13).toString("base64url");
  await pool.execute(
    "INSERT INTO operators (public_id, full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'admin', 'active')",
    [publicId, name, email, passwordHash],
  );
  console.log(`Created the initial Chatmodz administrator for ${email}.`);
} finally {
  await pool.end();
}