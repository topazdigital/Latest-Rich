---
name: Chatmodz preview database
description: Local preview setup for testing Chatmodz authentication before external hosting
---

The Chatmodz preview can run against a temporary isolated MariaDB/MySQL instance with `artifacts/chatmodz/database/schema.mysql.sql` applied. It must never reuse Rich Dating Network's database or the Replit PostgreSQL database.

**Why:** Chatmodz's operator accounts, conversations, delivery records, and site adapters are a separate product boundary; preview login testing should exercise the real MySQL-backed API without risking dating-site data.

**How to apply:** For hosted use, replace the temporary preview connection with a dedicated MySQL 8 `CHATMODZ_DATABASE_URL`, apply the Chatmodz schema, and bootstrap the first admin through environment secrets.