import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// =======================================================
// REALTIME BROADCAST (SSE)
// - Auto refresh when other user updates inventory/assets
// =======================================================
const sseClients = new Map();
let sseSeq = 1;

function sseWrite(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data ?? {})}\n\n`);
  } catch {
    // ignore broken pipe
  }
}

function sseBroadcast(event, data) {
  for (const [id, c] of sseClients.entries()) {
    try {
      sseWrite(c.res, event, data);
    } catch {
      try { c.res.end(); } catch {}
      sseClients.delete(id);
    }
  }
}

// =======================================================
// MYSQL / MARIADB
// =======================================================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // IMPORTANT:
  // Return DATE/DATETIME as strings (e.g. '2026-01-21') instead of JS Date objects.
  // If JS Date is serialized to ISO (UTC), the frontend timezone (+07) can show "-1 day".
  dateStrings: true,
});

async function safeAlter(sql) {
  try {
    await pool.query(sql);
  } catch (err) {
    const code = err?.code || "";
    const msg = String(err?.message || "");
    if (
      code === "ER_DUP_FIELDNAME" ||
      msg.includes("Duplicate column name") ||
      msg.includes("already exists")
    ) {
      return;
    }
    console.error("safeAlter error:", err);
  }
}

async function initDB() {
  // users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','user') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =========================
  // ASSETS
  // =========================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      asset_tag VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,

      type ENUM('LAPTOP','PC','SERVER','NETWORK','PRINTER','OTHER') NOT NULL DEFAULT 'OTHER',
      status ENUM('IN_USE','IN_STOCK','REPAIR','RETIRED') NOT NULL DEFAULT 'IN_STOCK',

      brand VARCHAR(128) NULL,
      model VARCHAR(128) NULL,
      serial_number VARCHAR(128) NULL,

      assigned_to VARCHAR(128) NULL,
      location VARCHAR(128) NULL,

      purchase_date DATE NULL,
      warranty_end DATE NULL,
      notes TEXT NULL,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      PRIMARY KEY (id),
      UNIQUE KEY uq_assets_asset_tag (asset_tag),
      UNIQUE KEY uq_assets_serial_number (serial_number),
      KEY idx_assets_status (status),
      KEY idx_assets_type (type),
      KEY idx_assets_location (location)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =========================
  // ASSET RETIREMENTS (Trash)
  // =========================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS asset_retirements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      asset_id BIGINT UNSIGNED NOT NULL,

      reason TEXT NULL,
      physical_condition VARCHAR(255) NULL,
      physical_location VARCHAR(255) NULL,

      disposal_status ENUM('IN_STORAGE','DISPOSED','SOLD','DONATED') NOT NULL DEFAULT 'IN_STORAGE',
      disposal_date DATE NULL,
      disposal_notes TEXT NULL,

      retired_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      retired_by VARCHAR(128) NULL,

      restored_at TIMESTAMP NULL,
      restored_by VARCHAR(128) NULL,
      restored_to_status ENUM('IN_USE','IN_STOCK','REPAIR') NULL,

      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      PRIMARY KEY (id),
      KEY idx_retirements_asset (asset_id),
      KEY idx_retirements_disposal_status (disposal_status),
      KEY idx_retirements_active (asset_id, restored_at),
      CONSTRAINT fk_retirements_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Tabel asset_retirements sudah ada dari sebelum kolom physical_location
  // ditambahkan - kolom ini menyimpan lokasi fisik barang (almari/kardus/
  // dsb), terpisah dari physical_condition (kondisi barang: baik/rusak/dsb)
  await safeAlter(`ALTER TABLE asset_retirements ADD COLUMN physical_location VARCHAR(255) NULL AFTER physical_condition`);

  // Backfill: asset yang statusnya sudah RETIRED dari SEBELUM fitur Trash
  // dibuat belum punya baris di asset_retirements. Idempotent — hanya
  // insert kalau belum ada retirement record aktif untuk asset itu.
  try {
    await pool.query(`
      INSERT INTO asset_retirements (asset_id, reason, physical_condition, physical_location, retired_by, retired_at)
      SELECT a.id,
             'DATA LAMA (RETIRED SEBELUM FITUR TRASH DIBUAT)',
             'BELUM DIKETAHUI — MOHON UPDATE KONDISI FISIKNYA',
             'BELUM DIKETAHUI — MOHON UPDATE LOKASI FISIKNYA',
             a.updated_by,
             a.updated_at
      FROM assets a
      WHERE a.status = 'RETIRED'
        AND NOT EXISTS (
          SELECT 1 FROM asset_retirements ar
          WHERE ar.asset_id = a.id AND ar.restored_at IS NULL
        )
    `);
  } catch (err) {
    console.error("backfill asset_retirements error:", err);
  }

  // Migrasi kecil: perbaiki teks placeholder backfill lama yang masih
  // mixed-case (dari sebelum data disamakan uppercase). Idempotent -
  // hanya update baris yang persis cocok dengan teks lama.
  await safeAlter(`
    UPDATE asset_retirements
    SET reason = 'DATA LAMA (RETIRED SEBELUM FITUR TRASH DIBUAT)'
    WHERE reason = 'Data lama (retired sebelum fitur Trash dibuat)'
  `);
  await safeAlter(`
    UPDATE asset_retirements
    SET physical_condition = 'BELUM DIKETAHUI — MOHON UPDATE KONDISI FISIKNYA'
    WHERE physical_condition = 'Belum diketahui — mohon update kondisi fisiknya'
  `);

  // Migrasi kecil: baris lama (sebelum kolom physical_location ada) masih
  // menyimpan info lokasi di kolom physical_condition. Pindahkan isinya
  // ke physical_location, dan isi physical_condition dengan placeholder
  // kondisi yang benar. Hanya jalan sekali per baris (physical_location
  // masih NULL).
  await safeAlter(`
    UPDATE asset_retirements
    SET physical_location = physical_condition,
        physical_condition = 'BELUM DIKETAHUI — MOHON UPDATE KONDISI FISIKNYA'
    WHERE physical_location IS NULL
      AND physical_condition IS NOT NULL
      AND physical_condition != 'BELUM DIKETAHUI — MOHON UPDATE KONDISI FISIKNYA'
  `);

  // =========================
  // ASSET HANDOVERS (Surat Tanda Terima)
  // =========================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS asset_handovers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      handover_number VARCHAR(64) NOT NULL,
      asset_id BIGINT UNSIGNED NOT NULL,

      handover_date DATE NOT NULL,
      receiver_name VARCHAR(150) NOT NULL,
      receiver_division VARCHAR(150) NOT NULL,
      receiver_phone VARCHAR(50) NOT NULL,

      handed_over_by VARCHAR(100) NULL,
      gen_month TINYINT UNSIGNED NOT NULL,
      gen_year SMALLINT UNSIGNED NOT NULL,
      seq_no INT UNSIGNED NOT NULL,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (id),
      UNIQUE KEY uq_handover_number (handover_number),
      KEY idx_handover_asset (asset_id),
      KEY idx_handover_period (gen_year, gen_month),
      CONSTRAINT fk_handover_asset FOREIGN KEY (asset_id) REFERENCES assets(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =========================
  // INVENTORY ITEMS
  // =========================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sku VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,

      category ENUM('STORAGE','MEMORY','NETWORK','PERIPHERAL','OTHER') NOT NULL DEFAULT 'OTHER',
      unit VARCHAR(32) NOT NULL DEFAULT 'pcs',
      location VARCHAR(128) NULL,

      stock INT NOT NULL DEFAULT 0,
      min_stock INT NOT NULL DEFAULT 0,

      notes TEXT NULL,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      PRIMARY KEY (id),
      UNIQUE KEY uq_inventory_sku (sku),
      KEY idx_inventory_location (location),
      KEY idx_inventory_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =========================
  // INVENTORY MOVEMENTS
  // =========================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      inventory_item_id BIGINT UNSIGNED NOT NULL,

      type ENUM('IN','OUT','ADJUST') NOT NULL,
      qty INT NOT NULL,
      ref VARCHAR(255) NULL,

      created_by VARCHAR(100) NULL,
      target_asset_id BIGINT UNSIGNED NULL,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (id),
      KEY idx_moves_item_time (inventory_item_id, created_at),
      KEY idx_moves_created_by (created_by),
      KEY idx_moves_target_asset (target_asset_id),
      CONSTRAINT fk_moves_item
        FOREIGN KEY (inventory_item_id)
        REFERENCES inventory_items(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_moves_target_asset
        FOREIGN KEY (target_asset_id)
        REFERENCES assets(id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // =========================
  // TONER
  // =========================
  await pool.query(`
  CREATE TABLE IF NOT EXISTS toner (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    
    toner_serial VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(128) NULL,
    
    vendor VARCHAR(128) NULL,
    origin VARCHAR(128) NULL,
    location VARCHAR(128) NULL,
    
    status ENUM('PENDING','ON_PROGRESS','FINISH') NOT NULL DEFAULT 'PENDING',
    
    notes TEXT NULL,
    
    created_by VARCHAR(100) NULL,
    updated_by VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    disabled_at DATETIME NULL,
    disabled_by VARCHAR(100) NULL,
    disabled_reason VARCHAR(255) NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_toner_serial (toner_serial),
    KEY idx_toner_status (status),
    KEY idx_toner_location (location),
    KEY idx_toner_vendor (vendor),
    KEY idx_toner_created_by (created_by),
    KEY idx_toner_updated_by (updated_by)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);

  // Idempotent upgrades
  await safeAlter(
    `ALTER TABLE inventory_movements ADD COLUMN created_by VARCHAR(100) NULL AFTER ref`
  );
  await safeAlter(
    `ALTER TABLE inventory_movements ADD COLUMN target_asset_id BIGINT UNSIGNED NULL AFTER created_by`
  );

  // Idempotent upgrades (inventory_movements extra fields)
  await safeAlter(
    `ALTER TABLE inventory_movements ADD COLUMN purchase_date DATE NULL AFTER target_asset_id`
  );
  await safeAlter(
    `ALTER TABLE inventory_movements ADD COLUMN purchase_location VARCHAR(128) NULL AFTER purchase_date`
  );
  await safeAlter(
    `ALTER TABLE inventory_movements ADD COLUMN destination VARCHAR(128) NULL AFTER purchase_location`
  );

  // Idempotent upgrades (inventory_items)
  await safeAlter(
    `ALTER TABLE inventory_items ADD COLUMN capacity VARCHAR(50) NULL AFTER location`
  );

  // =========================
  // SOFT DELETE (is_active)
  // =========================
  await safeAlter(
    `ALTER TABLE inventory_items ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER notes`
  );
  await safeAlter(
    `ALTER TABLE inventory_items ADD COLUMN disabled_at DATETIME NULL AFTER is_active`
  );
  await safeAlter(
    `ALTER TABLE inventory_items ADD COLUMN disabled_by VARCHAR(100) NULL AFTER disabled_at`
  );
  await safeAlter(
    `ALTER TABLE inventory_items ADD COLUMN disabled_reason VARCHAR(255) NULL AFTER disabled_by`
  );

  await safeAlter(
    `ALTER TABLE assets ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER notes`
  );
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN disabled_at DATETIME NULL AFTER is_active`
  );
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN disabled_by VARCHAR(100) NULL AFTER disabled_at`
  );
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN disabled_reason VARCHAR(255) NULL AFTER disabled_by`
  );

    // Idempotent upgrades (assets spec & checklist)
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN cpu_spec VARCHAR(255) NULL AFTER notes`
  );
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN ram_spec VARCHAR(255) NULL AFTER cpu_spec`
  );
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN hdd_spec VARCHAR(255) NULL AFTER ram_spec`
  );
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN vga_card VARCHAR(255) NULL AFTER hdd_spec`
  );
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN ck_usb_lan TINYINT(1) NOT NULL DEFAULT 0 AFTER vga_card`
  );
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN ck_mouse TINYINT(1) NOT NULL DEFAULT 0 AFTER ck_usb_lan`
  );
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN ck_tas TINYINT(1) NOT NULL DEFAULT 0 AFTER ck_mouse`
  );
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN ck_keyboard TINYINT(1) NOT NULL DEFAULT 0 AFTER ck_tas`
  );
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN ck_usb_hub TINYINT(1) NOT NULL DEFAULT 0 AFTER ck_keyboard`
  );

  // Idempotent upgrades (toner)
  await safeAlter(
    `ALTER TABLE toner ADD COLUMN created_by VARCHAR(100) NULL AFTER created_at`
  );

  await safeAlter(
    `ALTER TABLE toner ADD COLUMN updated_by VARCHAR(100) NULL AFTER updated_at`
  );

  // Idempotent upgrades (profile)
  await safeAlter(
    `ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER created_at`
  );

  await safeAlter(
    `ALTER TABLE users ADD COLUMN disabled_at DATETIME NULL AFTER is_active`
  );

  await safeAlter(
    `ALTER TABLE users ADD COLUMN disabled_by VARCHAR(100) NULL AFTER disabled_at`
  );

  await safeAlter(
    `ALTER TABLE users ADD COLUMN disabled_reason VARCHAR(255) NULL AFTER disabled_by`
  );

  await safeAlter(
    `ALTER TABLE users ADD COLUMN updated_at DATETIME NULL AFTER disabled_reason`
  );

  // =========================
  // ADD created_by & updated_by to assets & inventory_items
  // =========================
  await safeAlter(
    `ALTER TABLE assets ADD COLUMN created_by VARCHAR(100) NULL AFTER ck_usb_hub`
  );

  await safeAlter(
    `ALTER TABLE assets ADD COLUMN updated_by VARCHAR(100) NULL AFTER created_by`
  );

  await safeAlter(
    `ALTER TABLE inventory_items ADD COLUMN created_by VARCHAR(100) NULL AFTER notes`
  );

  await safeAlter(
    `ALTER TABLE inventory_items ADD COLUMN updated_by VARCHAR(100) NULL AFTER created_by`
  );

  // Tambah kolom untuk monitor dan storage
await safeAlter(
  `ALTER TABLE assets ADD COLUMN monitor_type VARCHAR(50) NULL AFTER ck_usb_hub`
);
await safeAlter(
  `ALTER TABLE assets ADD COLUMN storage_type VARCHAR(50) NULL AFTER monitor_type`
);

  // =========================
  // ACTIVITY LOGS (global audit)
  // =========================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

      actor_username VARCHAR(100) NULL,
      actor_user_id BIGINT NULL,

      action ENUM(
        'ASSET_CREATE','ASSET_UPDATE','ASSET_DELETE',
        'ASSET_RETIRE','ASSET_TRASH_UPDATE','ASSET_RESTORE_FROM_TRASH','ASSET_HANDOVER',
        'INV_CREATE','INV_UPDATE','INV_DELETE','INV_MOVE',
        'USER_CREATE','USER_UPDATE','USER_DELETE',
        'TONER_CREATE','TONER_UPDATE','TONER_DELETE','TONER_MOVE'
      ) NOT NULL,

      entity_type ENUM('ASSET','ASSET_RETIREMENT','INVENTORY','USER','TONER') NOT NULL,
      entity_id BIGINT UNSIGNED NULL,

      meta JSON NULL,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (id),
      KEY idx_activity_time (created_at),
      KEY idx_activity_actor (actor_username),
      KEY idx_activity_entity (entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Idempotent upgrade: tambah value ENUM baru untuk fitur Trash
  // (aman dijalankan berulang - cuma re-set daftar ENUM yang sama)
  await safeAlter(`
    ALTER TABLE activity_logs MODIFY COLUMN action ENUM(
      'ASSET_CREATE','ASSET_UPDATE','ASSET_DELETE',
      'ASSET_RETIRE','ASSET_TRASH_UPDATE','ASSET_RESTORE_FROM_TRASH','ASSET_HANDOVER',
      'INV_CREATE','INV_UPDATE','INV_DELETE','INV_MOVE',
      'USER_CREATE','USER_UPDATE','USER_DELETE',
      'TONER_CREATE','TONER_UPDATE','TONER_DELETE','TONER_MOVE'
    ) NOT NULL
  `);
  await safeAlter(`
    ALTER TABLE activity_logs MODIFY COLUMN entity_type
      ENUM('ASSET','ASSET_RETIREMENT','INVENTORY','USER','TONER') NOT NULL
  `);
}

initDB().catch(console.error);

async function seedAdmin() {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASS;
  if (!username || !password) return;

  const [rows] = await pool.query("SELECT id FROM users WHERE username = ?", [
    username,
  ]);

  if (rows.length === 0) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')",
      [username, hash]
    );
    console.log("Admin user created");
  }
}
seedAdmin().catch(console.error);

// =======================================================
// AUTH
// =======================================================
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id?, username, role }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin Only" });
  }
  next();
}

// =======================================================
// SSE Stream (Realtime events)
// - Use fetch() client (can send Authorization header)
// - Also supports token in query: /api/events/stream?token=...
// =======================================================
function readBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  const headerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  const queryToken = typeof req.query?.token === "string" ? req.query.token : "";
  return headerToken || queryToken || "";
}

function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Helper untuk generate serial TNR-YYMMDD-XX
async function generateTonerSerial() {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`;
  
  const prefix = `TNR-${datePart}`;
  
  const [rows] = await pool.query(
    `SELECT toner_serial FROM toner 
     WHERE toner_serial LIKE ? 
     ORDER BY toner_serial DESC 
     LIMIT 1`,
    [`${prefix}-%`]
  );
  
  if (rows.length === 0) {
    return `${prefix}-01`;
  }
  
  const lastSerial = rows[0].toner_serial;
  const lastNumber = parseInt(lastSerial.split('-')[2]) || 0;
  const nextNumber = String(lastNumber + 1).padStart(2, '0');
  
  return `${prefix}-${nextNumber}`;
}

// Helper untuk generate Asset Tag berdasarkan location
async function generateAssetTag(location) {
  // Ambil 3 karakter pertama dari location (huruf besar)
  const locPrefix = location ? 
    location.trim().replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 3) : 
    "ASS";
  
  const [[row]] = await pool.query(
    `SELECT asset_tag FROM assets 
     WHERE asset_tag LIKE ? 
     ORDER BY asset_tag DESC 
     LIMIT 1`,
    [`${locPrefix}-%`]
  );
  
  if (!row) {
    return `${locPrefix}-001`;
  }
  
  const lastTag = row.asset_tag;
  const lastNumber = parseInt(lastTag.split('-')[1]) || 0;
  const nextNumber = String(lastNumber + 1).padStart(3, '0');
  
  return `${locPrefix}-${nextNumber}`;
}

// Helper untuk generate SKU otomatis
async function generateSKU(name, category) {
  // Ambil 3 huruf pertama dari category
  let categoryPart = "CAT";
  if (category && category.trim()) {
    categoryPart = category.trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .substring(0, 3);
    if (categoryPart.length === 0) categoryPart = "CAT";
  }
  
  // Ambil 3-5 karakter dari name
  let namePart = "ITEM";
  if (name && name.trim()) {
    namePart = name.trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .substring(0, 5);
    if (namePart.length === 0) namePart = "ITEM";
  }
  
  const prefix = `${categoryPart}${namePart}`;
  
  const [[row]] = await pool.query(
    `SELECT sku FROM inventory_items 
     WHERE sku LIKE ? 
     ORDER BY sku DESC 
     LIMIT 1`,
    [`${prefix}%`] // Perhatikan: tanpa tanda "-" sebelum angka
  );
  
  if (!row) {
    return `${prefix}001`;
  }
  
  const lastSku = row.sku;
  // Format: CATNAME001, CATNAME002
  // Ekstrak angka dari akhir string
  const skuWithoutPrefix = lastSku.substring(prefix.length);
  const match = skuWithoutPrefix.match(/^(\d+)/);
  const lastNumber = match ? parseInt(match[1]) : 0;
  const nextNumber = String(lastNumber + 1).padStart(3, '0');
  
  return `${prefix}${nextNumber}`;
}

app.get("/api/events/stream", (req, res) => {
  const token = readBearerToken(req);
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });

  // SSE headers
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  // flush headers early
  res.flushHeaders?.();

  const id = String(sseSeq++);
  const client = {
    id,
    res,
    username: decoded?.username || "",
    connectedAt: Date.now(),
  };
  sseClients.set(id, client);

  // initial hello
  sseWrite(res, "hello", { ok: true, ts: Date.now() });

  // keepalive
  const keepAlive = setInterval(() => {
    try {
      res.write(`: keepalive ${Date.now()}\n\n`);
    } catch {
      clearInterval(keepAlive);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseClients.delete(id);
    try { res.end(); } catch {}
  });
});

async function logActivity({ req, action, entityType, entityId, meta }) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (actor_username, actor_user_id, action, entity_type, entity_id, meta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user?.username || null,
        req.user?.id || null,
        action,
        entityType,
        entityId ? Number(entityId) : null,
        meta ? JSON.stringify(meta) : null,
      ]
    );
  } catch (err) {
    console.error("logActivity error:", err);
  }
}

app.get("/api/auth/check-status", authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID not found in token" });
    }

    const [rows] = await pool.query(
      "SELECT is_active, disabled_at, disabled_by, disabled_reason FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userStatus = rows[0];
    
    res.json({
      isActive: userStatus.is_active === 1,
      disabledAt: userStatus.disabled_at,
      disabledBy: userStatus.disabled_by,
      disabledReason: userStatus.disabled_reason,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("Check status error:", err);
    res.status(500).json({ error: "Failed to check user status" });
  }
});

// ===== LOGIN =====
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // /**
    //  * ======================================
    //  * HARD-CODED ROOT LOGIN (NO DATABASE)
    //  * ======================================
    //  */
    // if (
    //   process.env.ROOT_USERNAME &&
    //   process.env.ROOT_PASSWORD &&
    //   username === process.env.ROOT_USERNAME &&
    //   password === process.env.ROOT_PASSWORD
    // ) {
    //   const token = jwt.sign(
    //     { username: "root", role: "admin" },
    //     process.env.JWT_SECRET,
    //     { expiresIn: "24h" }
    //   );

    //   return res.json({ token, role: "admin" });
    // }

    /**
     * =========================
     * DATABASE LOGIN (EXISTING)
     * =========================
     */
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "10h" }
    );

    res.json({ token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ===== HEALTH =====
app.get("/api/storage/status", (req, res) => {
  res.json({ enabled: true, gitBackup: false, version: "1.0.0" });
});

// =======================================================
// IT ASSET & INVENTORY (MYSQL/MARIADB)
// =======================================================

// ----- Dashboard summary -----
app.get("/api/dashboard/summary", authenticate, async (req, res) => {
  try {
    const [[kpiAssets]] = await pool.query(
      `SELECT COUNT(*) AS totalAssets FROM assets WHERE is_active = 1`
    );
    const [[kpiRepair]] = await pool.query(
      `SELECT COUNT(*) AS assetsInRepair FROM assets WHERE is_active = 1 AND status='REPAIR'`
    );

    const [[kpiInvQty]] = await pool.query(
      `SELECT COALESCE(SUM(stock),0) AS totalInventoryQty FROM inventory_items WHERE is_active = 1`
    );
    const [[kpiLow]] = await pool.query(
      `SELECT COUNT(*) AS lowStockItems FROM inventory_items WHERE is_active = 1 AND stock < min_stock`
    );
    const [[kpiTrash]] = await pool.query(
      `SELECT COUNT(*) AS trashCount FROM asset_retirements WHERE restored_at IS NULL`
    );

    const [assetsByStatus] = await pool.query(
      `SELECT status AS name, COUNT(*) AS value
       FROM assets
       WHERE is_active = 1
       GROUP BY status
       ORDER BY value DESC`
    );

    const [inventoryByLocation] = await pool.query(
      `SELECT COALESCE(location,'UNKNOWN') AS name, COALESCE(SUM(stock),0) AS value
       FROM inventory_items
       WHERE is_active = 1
       GROUP BY COALESCE(location,'UNKNOWN')
       ORDER BY value DESC`
    );

    const [recentAssets] = await pool.query(
            `SELECT id,
              asset_tag AS assetTag,
              name,
              type,
              status,
              brand,
              model,
              serial_number AS serialNumber,
              assigned_to AS assignedTo,
              location,
              purchase_date AS purchaseDate,
              warranty_end AS warrantyEnd,
              notes,
              cpu_spec AS cpuSpec,
              ram_spec AS ramSpec,
              hdd_spec AS hddSpec,
              vga_card AS vgaCard,
              created_by AS createdBy,    
              updated_by AS updatedBy,
              ck_usb_lan AS ckUsbLan,
              ck_mouse AS ckMouse,
              ck_tas AS ckTas,
              ck_keyboard AS ckKeyboard,
              ck_usb_hub AS ckUsbHub,
              monitor_type AS monitorType,
              storage_type AS storageType,
              created_at AS createdAt,
              updated_at AS updatedAt
       FROM assets
       WHERE is_active = 1
       ORDER BY created_at DESC
       LIMIT 6`
    );

    const [lowStockList] = await pool.query(
      `SELECT id,
              sku,
              name,
              category,
              unit,
              location,
              capacity,
              stock,
              min_stock AS minStock,
              notes,
              created_at AS createdAt,
              updated_at AS updatedAt
       FROM inventory_items
       WHERE is_active = 1 AND stock < min_stock
       ORDER BY (min_stock - stock) DESC
       LIMIT 10`
    );

    res.json({
      kpis: {
        totalAssets: Number(kpiAssets.totalAssets) || 0,
        totalInventoryQty: Number(kpiInvQty.totalInventoryQty) || 0,
        lowStockItems: Number(kpiLow.lowStockItems) || 0,
        assetsInRepair: Number(kpiRepair.assetsInRepair) || 0,
        trashCount: Number(kpiTrash.trashCount) || 0,
      },
      assetsByStatus,
      inventoryByLocation,
      recentAssets,
      lowStockList,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to build dashboard summary" });
  }
});

// ----- Dashboard toner summary -----
app.get("/api/dashboard/toner-summary", authenticate, async (req, res) => {
  try {
    // Get all toner data
    const [tonerRows] = await pool.query(
      `SELECT toner_serial AS tonerSerial, name, status, origin, location, created_at AS createdAt
       FROM toner WHERE is_active = 1`
    );

    // Process toner by status
    const tonerByStatus = {
      PENDING: 0,
      ON_PROGRESS: 0,
      FINISH: 0,
    };

    tonerRows.forEach((toner) => {
      if (toner.status in tonerByStatus) {
        tonerByStatus[toner.status]++;
      }
    });

    // Convert to array format for charts
    const byStatusArray = Object.entries(tonerByStatus).map(([name, value]) => ({
      name,
      value,
    }));

    // Get not finish toner (PENDING or ON_PROGRESS)
    const notFinishToner = tonerRows.filter(
      (t) => t.status === "PENDING" || t.status === "ON_PROGRESS"
    );

    // Get recent not finish (limit 5)
    const recentNotFinish = notFinishToner
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    res.json({
      byStatus: byStatusArray,
      notFinishCount: notFinishToner.length,
      recentNotFinish,
      total: tonerRows.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to build toner dashboard summary" });
  }
});

// ----- Recent activity trends (last 30 days) -----
app.get("/api/dashboard/activity-trends", authenticate, async (req, res) => {
  try {
    // Get activity data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Asset activities
    const [assetActivities] = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM activity_logs 
       WHERE entity_type = 'ASSET' 
         AND created_at >= ?
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [thirtyDaysAgo.toISOString().split('T')[0]]
    );

    // Inventory activities
    const [inventoryActivities] = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM activity_logs 
       WHERE entity_type = 'INVENTORY' 
         AND created_at >= ?
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [thirtyDaysAgo.toISOString().split('T')[0]]
    );

    // Toner activities (using assets logs for toner)
    const [tonerActivities] = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM activity_logs 
       WHERE entity_type = 'ASSET' 
         AND meta LIKE '%"type":"TONER"%'
         AND created_at >= ?
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [thirtyDaysAgo.toISOString().split('T')[0]]
    );

    // Create date range for last 30 days
    const trends = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // const assetCount = assetActivities.find(a => 
      //   a.date.toISOString().split('T')[0] === dateStr
      // )?.count || 0;

      // const inventoryCount = inventoryActivities.find(a => 
      //   a.date.toISOString().split('T')[0] === dateStr
      // )?.count || 0;

      // const tonerCount = tonerActivities.find(a => 
      //   a.date.toISOString().split('T')[0] === dateStr
      // )?.count || 0;

      const assetCount = assetActivities.find(a => a.date === dateStr)?.count || 0;
      const inventoryCount = inventoryActivities.find(a => a.date === dateStr)?.count || 0;
      const tonerCount = tonerActivities.find(a => a.date === dateStr)?.count || 0;

      // Only show every 5th day to reduce data points
      if (i % 5 === 0) {
        trends.push({
          date: `Day ${30 - i}`,
          assets: assetCount,
          inventory: inventoryCount,
          toner: tonerCount,
        });
      }
    }

    // Ensure we have at least 7 data points
    if (trends.length < 7) {
      const interval = Math.floor(30 / 7);
      trends.length = 0;
      for (let i = 0; i < 7; i++) {
        const dayNum = i * interval;
        const date = new Date();
        date.setDate(date.getDate() - (30 - dayNum));
        const dateStr = date.toISOString().split('T')[0];

        const assetCount = assetActivities.find(a => 
          a.date.toISOString().split('T')[0] === dateStr
        )?.count || Math.floor(Math.random() * 5) + 2;

        const inventoryCount = inventoryActivities.find(a => 
          a.date.toISOString().split('T')[0] === dateStr
        )?.count || Math.floor(Math.random() * 5) + 1;

        const tonerCount = tonerActivities.find(a => 
          a.date.toISOString().split('T')[0] === dateStr
        )?.count || Math.floor(Math.random() * 3) + 1;

        trends.push({
          date: `Day ${dayNum}`,
          assets: assetCount,
          inventory: inventoryCount,
          toner: tonerCount,
        });
      }
    }

    res.json({ trends });
  } catch (err) {
    console.error(err);
    // Return sample data if error
    res.json({
      trends: [
        { date: 'Day 1', assets: 4, inventory: 3, toner: 2 },
        { date: 'Day 5', assets: 7, inventory: 5, toner: 4 },
        { date: 'Day 10', assets: 12, inventory: 8, toner: 6 },
        { date: 'Day 15', assets: 9, inventory: 12, toner: 8 },
        { date: 'Day 20', assets: 14, inventory: 10, toner: 9 },
        { date: 'Day 25', assets: 16, inventory: 14, toner: 11 },
        { date: 'Day 30', assets: 18, inventory: 16, toner: 13 },
      ],
    });
  }
});

// ----- Assets CRUD -----
app.get("/api/assets", authenticate, async (req, res) => {
  try {
    
    // active: "1" | "0" | "all" (soft delete)
    const { search = "", status = "", type = "", location = "", active = "1"  } = req.query;
    const q = `%${String(search)}%`;

    const where = [];
    const params = [];

    if (search) {
      where.push(
        `(asset_tag LIKE ? OR name LIKE ? OR model LIKE ? OR assigned_to LIKE ?)`
      );
      params.push(q, q, q, q);
    }
    if (status) {
      where.push(`status = ?`);
      params.push(String(status));
    }
    if (type) {
      where.push(`type = ?`);
      params.push(String(type));
    }
    if (location) {
      where.push(`location = ?`);
      params.push(String(location));
    }
    
    // soft-delete filter
    if (active && String(active) !== "all") {
      where.push(`is_active = ?`);
      params.push(String(active) === "1" ? 1 : 0);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
            `SELECT id,
              asset_tag AS assetTag,
              name,
              type,
              status,
              brand,
              model,
              serial_number AS serialNumber,
              assigned_to AS assignedTo,
              location,
              purchase_date AS purchaseDate,
              warranty_end AS warrantyEnd,
              notes,
              cpu_spec AS cpuSpec,
              ram_spec AS ramSpec,
              hdd_spec AS hddSpec,
              vga_card AS vgaCard,
              ck_usb_lan AS ckUsbLan,
              ck_mouse AS ckMouse,
              ck_tas AS ckTas,
              ck_keyboard AS ckKeyboard,
              ck_usb_hub AS ckUsbHub,
              monitor_type AS monitorType,
              storage_type AS storageType,
              created_by AS createdBy,     
              updated_by AS updatedBy,     
              created_at AS createdAt,
              updated_at AS updatedAt,
              is_active AS isActive,
              disabled_at AS disabledAt,
              disabled_by AS disabledBy,
              disabled_reason AS disabledReason,
              lh.handover_number AS lastHandoverNumber,
              lh.handover_date AS lastHandoverDate,
              lh.receiver_name AS lastHandoverReceiverName,
              lh.receiver_division AS lastHandoverReceiverDivision,
              lh.receiver_phone AS lastHandoverReceiverPhone,
              lh.handed_over_by AS lastHandoverBy
       FROM assets
       LEFT JOIN (
         SELECT ah1.*
         FROM asset_handovers ah1
         INNER JOIN (
           SELECT asset_id, MAX(created_at) AS max_created
           FROM asset_handovers
           GROUP BY asset_id
         ) latest ON latest.asset_id = ah1.asset_id AND latest.max_created = ah1.created_at
       ) lh ON lh.asset_id = assets.id
       ${whereSql}
       ORDER BY updated_at DESC, id DESC`,
      params
    );

    // send id as string to match FE convention
    res.json(rows.map((r) => ({ ...r, id: String(r.id) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load assets" });
  }
});

app.post("/api/assets", authenticate, adminOnly, async (req, res) => {
  try {
    const {
      assetTag,
      name,
      type = "OTHER",
      status = "IN_STOCK",
      brand,
      model,
      serialNumber,
      assignedTo,
      location,
      purchaseDate,
      warrantyEnd,
      notes,
      cpuSpec,
      ramSpec,
      hddSpec,
      vgaCard,
      ckUsbLan,
      ckMouse,
      ckTas,
      ckKeyboard,
      ckUsbHub,
      monitorType,
      storageType,
    } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    // Generate asset tag otomatis jika tidak disediakan
    let finalAssetTag = assetTag;
    if (!finalAssetTag || finalAssetTag.trim() === "") {
      if (!location) {
        return res.status(400).json({ error: "Location diperlukan untuk generate asset tag otomatis" });
      }
      finalAssetTag = await generateAssetTag(location);
    }

    const [result] = await pool.query(
      `INSERT INTO assets (
         asset_tag, name, type, status,
         brand, model, serial_number,
         assigned_to, location,
         purchase_date, warranty_end, notes,
         cpu_spec, ram_spec, hdd_spec, vga_card,
         ck_usb_lan, ck_mouse, ck_tas, ck_keyboard, ck_usb_hub,
         monitor_type, storage_type,
         created_by
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalAssetTag,
        String(name),
        String(type),
        String(status),
        brand ?? null,
        model ?? null,
        serialNumber ?? null,
        assignedTo ?? null,
        location ?? null,
        purchaseDate ? String(purchaseDate) : null,
        warrantyEnd ? String(warrantyEnd) : null,
        notes ?? null,
        cpuSpec ?? null,
        ramSpec ?? null,
        hddSpec ?? null,
        vgaCard ?? null,
        ckUsbLan ? 1 : 0,
        ckMouse ? 1 : 0,
        ckTas ? 1 : 0,
        ckKeyboard ? 1 : 0,
        ckUsbHub ? 1 : 0,
        monitorType ?? null,
        storageType ?? null,
        req.user?.username || null,
      ]
    );

    const id = String(result.insertId);
    await logActivity({
      req,
      action: "ASSET_CREATE",
      entityType: "ASSET",
      entityId: id,
      meta: { 
      assetTag, 
      name,
      type,
      status,
      brand,
      model,
      serialNumber,
      assignedTo,
      location,
      purchaseDate,
      warrantyEnd},
    });

    // realtime broadcast
    sseBroadcast("assets_changed", {
      action: "create",
      entityId: id,
      by: req.user?.username || null,
      ts: Date.now(),
    });
    sseBroadcast("dashboard_changed", { ts: Date.now() });

    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create asset" });
  }
});

app.put("/api/assets/:id", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "invalid id" });
    }

    const payload = req.body || {};

    // --- cegah ubah status RETIRED lewat endpoint generik ini ---
    // (harus lewat /retire dan /trash/:id/restore supaya data asset_retirements konsisten)
    if (payload.status !== undefined) {
      const [curRows] = await pool.query(`SELECT status FROM assets WHERE id = ?`, [id]);
      const curStatus = curRows?.[0]?.status;
      if (payload.status === "RETIRED" && curStatus !== "RETIRED") {
        return res.status(400).json({
          error: "Gunakan endpoint retire untuk memindahkan asset ke Trash",
        });
      }
      if (curStatus === "RETIRED" && payload.status !== "RETIRED") {
        return res.status(400).json({
          error: "Asset sedang di Trash, gunakan restore dari halaman Trash",
        });
      }
    }

    // --- ambil data sebelum update (untuk history diff) ---
    const [rows] = await pool.query(
      `SELECT
         asset_tag,
         name,
         type,
         status,
         brand,
         model,
         serial_number,
         assigned_to,
         location,
         purchase_date,
         warranty_end,
         notes,
         cpu_spec,
         ram_spec,
         hdd_spec,
         vga_card,
         ck_usb_lan,
         ck_mouse,
         ck_tas,
         ck_keyboard,
         ck_usb_hub,
         monitor_type,
         storage_type
       FROM assets
       WHERE id = ?`,
      [id]
    );
    const beforeRow = Array.isArray(rows) ? rows[0] : null;

    // --- update aset (aman untuk PATCH: field yang tidak dikirim tidak akan mengosongkan data) ---
    const ckUsbLan = payload.ckUsbLan === undefined ? null : (payload.ckUsbLan ? 1 : 0);
    const ckMouse = payload.ckMouse === undefined ? null : (payload.ckMouse ? 1 : 0);
    const ckTas = payload.ckTas === undefined ? null : (payload.ckTas ? 1 : 0);
    const ckKeyboard = payload.ckKeyboard === undefined ? null : (payload.ckKeyboard ? 1 : 0);
    const ckUsbHub = payload.ckUsbHub === undefined ? null : (payload.ckUsbHub ? 1 : 0);

    await pool.query(
      `UPDATE assets SET
         asset_tag     = COALESCE(?, asset_tag),
         name          = COALESCE(?, name),
         type          = COALESCE(?, type),
         status        = COALESCE(?, status),
         brand         = COALESCE(?, brand),
         model         = COALESCE(?, model),
         serial_number = COALESCE(?, serial_number),
         assigned_to   = COALESCE(?, assigned_to),
         location      = COALESCE(?, location),
         purchase_date = COALESCE(?, purchase_date),
         warranty_end  = COALESCE(?, warranty_end),
         notes         = COALESCE(?, notes),
         cpu_spec      = COALESCE(?, cpu_spec),
         ram_spec      = COALESCE(?, ram_spec),
         hdd_spec      = COALESCE(?, hdd_spec),
         vga_card      = COALESCE(?, vga_card),
         ck_usb_lan    = COALESCE(?, ck_usb_lan),
         ck_mouse      = COALESCE(?, ck_mouse),
         ck_tas        = COALESCE(?, ck_tas),
         ck_keyboard   = COALESCE(?, ck_keyboard),
         ck_usb_hub    = COALESCE(?, ck_usb_hub),
         monitor_type  = COALESCE(?, monitor_type),
         storage_type  = COALESCE(?, storage_type),
         updated_by    = ?
       WHERE id = ?`,
      [
        payload.assetTag ?? null,
        payload.name ?? null,
        payload.type ?? null,
        payload.status ?? null,
        payload.brand ?? null,
        payload.model ?? null,
        payload.serialNumber ?? null,
        payload.assignedTo ?? null,
        payload.location ?? null,
        payload.purchaseDate ? String(payload.purchaseDate) : null,
        payload.warrantyEnd ? String(payload.warrantyEnd) : null,
        payload.notes ?? null,
        payload.cpuSpec ?? null,
        payload.ramSpec ?? null,
        payload.hddSpec ?? null,
        payload.vgaCard ?? null,
        ckUsbLan,
        ckMouse,
        ckTas,
        ckKeyboard,
        ckUsbHub,
        payload.monitorType ?? null,
        payload.storageType ?? null,
        req.user?.username || null,
        id,
      ]
    );

    // --- ambil data sesudah update untuk history diff (biar diff akurat walau payload parsial) ---
    const [rowsAfter] = await pool.query(
      `SELECT
         asset_tag,
         name,
         type,
         status,
         brand,
         model,
         serial_number,
         assigned_to,
         location,
         purchase_date,
         warranty_end,
         notes,
         cpu_spec,
         ram_spec,
         hdd_spec,
         vga_card,
         ck_usb_lan,
         ck_mouse,
         ck_tas,
         ck_keyboard,
         ck_usb_hub,
         monitor_type,
         storage_type
       FROM assets
       WHERE id = ?`,
      [id]
    );
    const afterRow = Array.isArray(rowsAfter) ? rowsAfter[0] : null;

    // --- bentuk meta before/after untuk history ---
    let meta = payload;
    if (beforeRow || afterRow) {
      const before = beforeRow
        ? {
            assetTag: beforeRow.asset_tag,
            name: beforeRow.name,
            type: beforeRow.type,
            status: beforeRow.status,
            brand: beforeRow.brand,
            model: beforeRow.model,
            serialNumber: beforeRow.serial_number,
            assignedTo: beforeRow.assigned_to,
            location: beforeRow.location,
            purchaseDate: beforeRow.purchase_date,
            warrantyEnd: beforeRow.warranty_end,
            notes: beforeRow.notes,
            cpuSpec: beforeRow.cpu_spec,
            ramSpec: beforeRow.ram_spec,
            hddSpec: beforeRow.hdd_spec,
            vgaCard: beforeRow.vga_card,
            ckUsbLan: Boolean(beforeRow.ck_usb_lan),
            ckMouse: Boolean(beforeRow.ck_mouse),
            ckTas: Boolean(beforeRow.ck_tas),
            ckKeyboard: Boolean(beforeRow.ck_keyboard),
            ckUsbHub: Boolean(beforeRow.ck_usb_hub),
            monitorType: beforeRow.monitor_type,
            storageType: beforeRow.storage_type,
          }
        : null;

      const after = afterRow
        ? {
            assetTag: afterRow.asset_tag,
            name: afterRow.name,
            type: afterRow.type,
            status: afterRow.status,
            brand: afterRow.brand,
            model: afterRow.model,
            serialNumber: afterRow.serial_number,
            assignedTo: afterRow.assigned_to,
            location: afterRow.location,
            purchaseDate: afterRow.purchase_date,
            warrantyEnd: afterRow.warranty_end,
            notes: afterRow.notes,
            cpuSpec: afterRow.cpu_spec,
            ramSpec: afterRow.ram_spec,
            hddSpec: afterRow.hdd_spec,
            vgaCard: afterRow.vga_card,
            ckUsbLan: Boolean(afterRow.ck_usb_lan),
            ckMouse: Boolean(afterRow.ck_mouse),
            ckTas: Boolean(afterRow.ck_tas),
            ckKeyboard: Boolean(afterRow.ck_keyboard),
            ckUsbHub: Boolean(afterRow.ck_usb_hub),
            monitorType: afterRow.monitor_type,
            storageType: afterRow.storage_type,
          }
        : payload;

      // kalau before tidak ada (log lama), tetap simpan after supaya FE bisa render
      meta = before ? { before, after } : after;
    }

    await logActivity({
      req,
      action: "ASSET_UPDATE",
      entityType: "ASSET",
      entityId: id,
      meta, // <--- pakai before/after kalau ada
    });

    // realtime broadcast
    sseBroadcast("assets_changed", {
      action: "update",
      entityId: String(id),
      by: req.user?.username || null,
      ts: Date.now(),
    });
    sseBroadcast("dashboard_changed", { ts: Date.now() });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update asset" });
  }
});

// Hard Delete Assets
// app.delete("/api/assets/:id", authenticate, adminOnly, async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

//     await pool.query(`DELETE FROM assets WHERE id=?`, [id]);

//     await logActivity({
//       req,
//       action: "ASSET_DELETE",
//       entityType: "ASSET",
//       entityId: id,
//       meta: {},
//     });

//     res.json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to delete asset" });
//   }
// });

app.post("/api/assets/:id/disable", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = (req.body?.reason || "").trim();
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    if (!reason) return res.status(400).json({ error: "reason is required" });

    const [r] = await pool.query(
      `UPDATE assets
       SET is_active = 0,
           disabled_at = NOW(),
           disabled_by = ?,
           disabled_reason = ?,
           updated_by = ?
       WHERE id = ?`,
      [req.user?.username || null, reason, req.user?.username || null, id]
    );

    if (r?.affectedRows === 0) return res.status(404).json({ error: "not found" });

    await logActivity({
      req,
      action: "ASSET_DELETE",
      entityType: "ASSET",
      entityId: id,
      meta: { soft: true, reason },
    });

    // realtime broadcast
    sseBroadcast("assets_changed", {
      action: "disable",
      entityId: String(id),
      by: req.user?.username || null,
      ts: Date.now(),
    });
    sseBroadcast("dashboard_changed", { ts: Date.now() });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "failed to disable" });
  }
});

app.post("/api/assets/:id/restore", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const [r] = await pool.query(
      `UPDATE assets
       SET is_active = 1,
           disabled_at = NULL,
           disabled_by = NULL,
           disabled_reason = NULL,
           updated_by = ?
       WHERE id = ?`,
      [req.user?.username || null, id]
    );

    if (r?.affectedRows === 0) return res.status(404).json({ error: "not found" });

    await logActivity({
      req,
      action: "ASSET_UPDATE",
      entityType: "ASSET",
      entityId: id,
      meta: { restored: true },
    });

    // realtime broadcast
    sseBroadcast("assets_changed", {
      action: "restore",
      entityId: String(id),
      by: req.user?.username || null,
      ts: Date.now(),
    });
    sseBroadcast("dashboard_changed", { ts: Date.now() });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "failed to restore" });
  }
});

// =========================
// TRASH (Retired Assets)
// =========================

// Pindahkan asset ke Trash (set status RETIRED + catat kondisi fisik)
app.post("/api/assets/:id/retire", authenticate, adminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const reason = (req.body?.reason || "").trim();
    const physicalCondition = (req.body?.physicalCondition || "").trim();
    const physicalLocation = (req.body?.physicalLocation || "").trim();
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    await conn.beginTransaction();

    const [rows] = await conn.query(`SELECT status FROM assets WHERE id = ? FOR UPDATE`, [id]);
    const asset = rows?.[0];
    if (!asset) {
      await conn.rollback();
      return res.status(404).json({ error: "not found" });
    }
    if (asset.status === "RETIRED") {
      await conn.rollback();
      return res.status(400).json({ error: "Asset sudah berada di Trash" });
    }

    await conn.query(
      `UPDATE assets SET status = 'RETIRED', updated_by = ? WHERE id = ?`,
      [req.user?.username || null, id]
    );

    const [ins] = await conn.query(
      `INSERT INTO asset_retirements
         (asset_id, reason, physical_condition, physical_location, retired_by)
       VALUES (?, ?, ?, ?, ?)`,
      [id, reason || null, physicalCondition || null, physicalLocation || null, req.user?.username || null]
    );

    await conn.commit();

    await logActivity({
      req,
      action: "ASSET_RETIRE",
      entityType: "ASSET",
      entityId: id,
      meta: { reason, physicalCondition, physicalLocation },
    });

    sseBroadcast("assets_changed", { action: "retire", entityId: String(id), by: req.user?.username || null, ts: Date.now() });
    sseBroadcast("dashboard_changed", { ts: Date.now() });

    res.json({ ok: true, retirementId: String(ins.insertId) });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Failed to retire asset" });
  } finally {
    conn.release();
  }
});

// List isi Trash (retirement aktif, belum di-restore)
app.get("/api/trash", authenticate, async (req, res) => {
  try {
    const { search = "", disposalStatus = "" } = req.query;
    const q = `%${String(search)}%`;

    const where = [`ar.restored_at IS NULL`];
    const params = [];

    if (search) {
      where.push(`(a.asset_tag LIKE ? OR a.name LIKE ? OR a.model LIKE ?)`);
      params.push(q, q, q);
    }
    if (disposalStatus) {
      where.push(`ar.disposal_status = ?`);
      params.push(String(disposalStatus));
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const [rows] = await pool.query(
      `SELECT
         ar.id AS retirementId,
         a.id AS assetId,
         a.asset_tag AS assetTag,
         a.name,
         a.type,
         a.brand,
         a.model,
         a.location,
         ar.reason,
         ar.physical_condition AS physicalCondition,
         ar.physical_location AS physicalLocation,
         ar.disposal_status AS disposalStatus,
         ar.disposal_date AS disposalDate,
         ar.disposal_notes AS disposalNotes,
         ar.retired_at AS retiredAt,
         ar.retired_by AS retiredBy
       FROM asset_retirements ar
       JOIN assets a ON a.id = ar.asset_id
       ${whereSql}
       ORDER BY ar.retired_at DESC, ar.id DESC`,
      params
    );

    res.json(rows.map((r) => ({ ...r, retirementId: String(r.retirementId), assetId: String(r.assetId) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load trash" });
  }
});

// Update info di Trash (kondisi fisik / finalize disposal)
app.put("/api/trash/:retirementId", authenticate, adminOnly, async (req, res) => {
  try {
    const retirementId = Number(req.params.retirementId);
    if (!Number.isFinite(retirementId)) return res.status(400).json({ error: "invalid id" });

    const payload = req.body || {};
    const validDisposalStatuses = ["IN_STORAGE", "DISPOSED", "SOLD", "DONATED"];
    if (payload.disposalStatus !== undefined && !validDisposalStatuses.includes(payload.disposalStatus)) {
      return res.status(400).json({ error: "invalid disposalStatus" });
    }

    // ambil asset_id dulu, supaya history-nya nyambung ke asset (bukan ke retirement row)
    const [assetRow] = await pool.query(`SELECT asset_id FROM asset_retirements WHERE id = ?`, [retirementId]);
    const assetId = assetRow?.[0]?.asset_id;
    if (!assetId) return res.status(404).json({ error: "not found" });

    const [r] = await pool.query(
      `UPDATE asset_retirements SET
         physical_condition = COALESCE(?, physical_condition),
         physical_location   = COALESCE(?, physical_location),
         disposal_status     = COALESCE(?, disposal_status),
         disposal_date       = COALESCE(?, disposal_date),
         disposal_notes      = COALESCE(?, disposal_notes)
       WHERE id = ? AND restored_at IS NULL`,
      [
        payload.physicalCondition ?? null,
        payload.physicalLocation ?? null,
        payload.disposalStatus ?? null,
        payload.disposalDate ? String(payload.disposalDate) : null,
        payload.disposalNotes ?? null,
        retirementId,
      ]
    );

    if (r?.affectedRows === 0) return res.status(404).json({ error: "not found" });

    await logActivity({
      req,
      action: "ASSET_TRASH_UPDATE",
      entityType: "ASSET",
      entityId: assetId,
      meta: payload,
    });

    sseBroadcast("assets_changed", { action: "trash_update", entityId: String(retirementId), by: req.user?.username || null, ts: Date.now() });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update trash entry" });
  }
});

// Restore asset dari Trash -> kembalikan ke status operasional
app.post("/api/trash/:retirementId/restore", authenticate, adminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const retirementId = Number(req.params.retirementId);
    const toStatus = String(req.body?.status || "");
    const validStatuses = ["IN_USE", "IN_STOCK", "REPAIR"];
    if (!Number.isFinite(retirementId)) return res.status(400).json({ error: "invalid id" });
    if (!validStatuses.includes(toStatus)) {
      return res.status(400).json({ error: "status harus salah satu dari IN_USE, IN_STOCK, REPAIR" });
    }

    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT asset_id FROM asset_retirements WHERE id = ? AND restored_at IS NULL FOR UPDATE`,
      [retirementId]
    );
    const retirement = rows?.[0];
    if (!retirement) {
      await conn.rollback();
      return res.status(404).json({ error: "not found" });
    }

    await conn.query(
      `UPDATE asset_retirements SET
         restored_at = NOW(),
         restored_by = ?,
         restored_to_status = ?
       WHERE id = ?`,
      [req.user?.username || null, toStatus, retirementId]
    );

    await conn.query(
      `UPDATE assets SET status = ?, updated_by = ? WHERE id = ?`,
      [toStatus, req.user?.username || null, retirement.asset_id]
    );

    await conn.commit();

    await logActivity({
      req,
      action: "ASSET_RESTORE_FROM_TRASH",
      entityType: "ASSET",
      entityId: retirement.asset_id,
      meta: { toStatus },
    });

    sseBroadcast("assets_changed", { action: "restore_from_trash", entityId: String(retirement.asset_id), by: req.user?.username || null, ts: Date.now() });
    sseBroadcast("dashboard_changed", { ts: Date.now() });

    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Failed to restore asset" });
  } finally {
    conn.release();
  }
});

// ----- Inventory CRUD -----
app.get("/api/inventory", authenticate, async (req, res) => {
  try {
    // active: "1" | "0" | "all" (soft delete)
    const { search = "", category = "", location = "", active = "1" } = req.query;
    const q = `%${String(search)}%`;

    const where = [];
    const params = [];

    if (search) {
      where.push(`(sku LIKE ? OR name LIKE ?)`);
      params.push(q, q);
    }
    if (category) {
      where.push(`category = ?`);
      params.push(String(category));
    }
    if (location) {
      where.push(`location = ?`);
      params.push(String(location));
    }

    // soft-delete filter
    if (active && String(active) !== "all") {
      where.push(`is_active = ?`);
      params.push(String(active) === "1" ? 1 : 0);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT id,
              sku,
              name,
              category,
              unit,
              location,
              capacity,
              stock,
              min_stock AS minStock,
              notes,
              created_by AS createdBy,    
              updated_by AS updatedBy,
              created_at AS createdAt,
              updated_at AS updatedAt,
              is_active AS isActive,
              disabled_at AS disabledAt,
              disabled_by AS disabledBy,
              disabled_reason AS disabledReason
       FROM inventory_items
       ${whereSql}
       ORDER BY updated_at DESC, id DESC`,
      params
    );

    res.json(rows.map((r) => ({ ...r, id: String(r.id) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load inventory" });
  }
});

// GET /api/inventory/move-options?limit=80
app.get("/api/inventory/move-options", authenticate, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit ?? 80);
    const limit = Math.max(10, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 80));

    const [plRows] = await pool.query(
      `SELECT purchase_location AS v, MAX(created_at) AS ts
       FROM inventory_movements
       WHERE purchase_location IS NOT NULL AND TRIM(purchase_location) <> ''
       GROUP BY purchase_location
       ORDER BY ts DESC
       LIMIT ?`,
      [limit]
    );

    const [dstRows] = await pool.query(
      `SELECT destination AS v, MAX(created_at) AS ts
       FROM inventory_movements
       WHERE destination IS NOT NULL AND TRIM(destination) <> ''
       GROUP BY destination
       ORDER BY ts DESC
       LIMIT ?`,
      [limit]
    );

    res.json({
      limit,
      purchaseLocations: (plRows || []).map((r) => String(r.v)),
      destinations: (dstRows || []).map((r) => String(r.v)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load move options" });
  }
});

app.post("/api/inventory", authenticate, adminOnly, async (req, res) => {
  try {
    const {
      sku,
      name,
      category = "OTHER",
      unit = "PCS",
      location,
      capacity,
      stock = 0,
      minStock = 0,
      notes,
    } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    // Generate SKU otomatis jika tidak disediakan
    let finalSku = sku;
    if (!finalSku || finalSku.trim() === "") {
      finalSku = await generateSKU(name, category);
    }

    const [result] = await pool.query(
      `INSERT INTO inventory_items (sku, name, category, unit, location, capacity, stock, min_stock, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalSku,
        String(name),
        String(category),
        String(unit || "PCS"),
        location ?? null,
        capacity ?? null,
        Number(stock) || 0,
        Number(minStock) || 0,
        notes ?? null,
        req.user?.username || null,
      ]
    );

    const id = String(result.insertId);
    await logActivity({
      req,
      action: "INV_CREATE",
      entityType: "INVENTORY",
      entityId: id,
      meta: {
        sku: finalSku,
        name,
        category,
        stock,
        minStock,
        location,
        capacity,
        unit,
      },
    });

    // realtime broadcast
    sseBroadcast("inventory_changed", {
      action: "create",
      entityId: id,
      by: req.user?.username || null,
      ts: Date.now(),
    });
    sseBroadcast("dashboard_changed", { ts: Date.now() });

    res.json({ id, sku: finalSku });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create inventory item" });
  }
});

app.put("/api/inventory/:id", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "invalid id" });
    }

    const payload = req.body || {};

    // ambil data sebelum update
    const [rows] = await pool.query(
      `SELECT sku,
              name,
              category,
              unit,
              location,
              capacity,
              stock,
              min_stock,
              notes,
              updated_by = ?
       FROM inventory_items
       WHERE id = ?`,
      [req.user?.username || null, id]
    );
    const beforeRow = Array.isArray(rows) ? rows[0] : null;

    // lakukan update seperti biasa
    await pool.query(
      `UPDATE inventory_items SET
         sku        = COALESCE(?, sku),
         name       = COALESCE(?, name),
         category   = COALESCE(?, category),
         unit       = COALESCE(?, unit),
         location   = ?,
         capacity   = ?,
         stock      = COALESCE(?, stock),
         min_stock  = COALESCE(?, min_stock),
         notes      = ?,
         updated_by = ?
       WHERE id = ?`,
      [
        payload.sku ?? null,
        payload.name ?? null,
        payload.category ?? null,
        payload.unit ?? null,
        payload.location ?? null,
        payload.capacity ?? null,
        payload.stock ?? null,
        payload.minStock ?? null,
        payload.notes ?? null,
        req.user?.username || null,
        id,
      ]
    );

    // siapkan meta untuk history: hanya field yang benar2 berubah
    let meta = payload;

    if (beforeRow) {
      const before = {
        sku: beforeRow.sku,
        name: beforeRow.name,
        category: beforeRow.category,
        unit: beforeRow.unit,
        location: beforeRow.location,
        capacity: beforeRow.capacity,
        stock: Number(beforeRow.stock ?? 0),
        minStock: Number(beforeRow.min_stock ?? 0),
        notes: beforeRow.notes,
      };

      const after = {
        sku: payload.sku ?? before.sku,
        name: payload.name ?? before.name,
        category: payload.category ?? before.category,
        unit: payload.unit ?? before.unit,
        location: payload.location ?? before.location,
        capacity: payload.capacity ?? before.capacity,
        stock:
          payload.stock !== undefined && payload.stock !== null
            ? Number(payload.stock)
            : before.stock,
        minStock:
          payload.minStock !== undefined && payload.minStock !== null
            ? Number(payload.minStock)
            : before.minStock,
        notes: payload.notes ?? before.notes,
      };

      meta = { before, after };
    }

    await logActivity({
      req,
      action: "INV_UPDATE",
      entityType: "INVENTORY",
      entityId: id,
      meta,          // <- pakai meta baru (before/after), bukan payload biasa
    });

    // realtime broadcast
    sseBroadcast("inventory_changed", {
      action: "update",
      entityId: String(id),
      by: req.user?.username || null,
      ts: Date.now(),
    });
    sseBroadcast("dashboard_changed", { ts: Date.now() });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update inventory item" });
  }
});

// Hard Delete Inventory
// app.delete("/api/inventory/:id", authenticate, adminOnly, async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

//     await pool.query(`DELETE FROM inventory_items WHERE id=?`, [id]);

//     await logActivity({
//       req,
//       action: "INV_DELETE",
//       entityType: "INVENTORY",
//       entityId: id,
//       meta: {},
//     });

//     res.json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to delete inventory item" });
//   }
// });

app.post("/api/inventory/:id/disable", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = (req.body?.reason || "").trim();
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    if (!reason) return res.status(400).json({ error: "reason is required" });

    const [r] = await pool.query(
      `UPDATE inventory_items
       SET is_active = 0,
           disabled_at = NOW(),
           disabled_by = ?,
           disabled_reason = ?,
           updated_by = ?
       WHERE id = ?`,
      [req.user?.username || null, reason, req.user?.username || null, id]
    );

    // optional: kalau id tidak ketemu
    if (r?.affectedRows === 0) return res.status(404).json({ error: "not found" });

    // Audit: pakai INV_DELETE (karena enum belum ada INV_DISABLE)
    await logActivity({
      req,
      action: "INV_DELETE",
      entityType: "INVENTORY",
      entityId: id,
      meta: { soft: true, reason },
    });

    // realtime broadcast
    sseBroadcast("inventory_changed", {
      action: "disable",
      entityId: String(id),
      by: req.user?.username || null,
      ts: Date.now(),
    });
    sseBroadcast("dashboard_changed", { ts: Date.now() });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "failed to disable" });
  }
});

app.post("/api/inventory/:id/restore", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const [r] = await pool.query(
      `UPDATE inventory_items
       SET is_active = 1,
           disabled_at = NULL,
           disabled_by = NULL,
           disabled_reason = NULL,
           updated_by = ?
       WHERE id = ?`,
      [req.user?.username || null, id]
    );

    if (r?.affectedRows === 0) return res.status(404).json({ error: "not found" });

    await logActivity({
      req,
      action: "INV_UPDATE",
      entityType: "INVENTORY",
      entityId: id,
      meta: { restored: true },
    });

    // realtime broadcast
    sseBroadcast("inventory_changed", {
      action: "restore",
      entityId: String(id),
      by: req.user?.username || null,
      ts: Date.now(),
    });
    sseBroadcast("dashboard_changed", { ts: Date.now() });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "failed to restore" });
  }
});

// ----- Inventory stock move + link to asset -----
app.post("/api/inventory/:id/move", authenticate, adminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const { type, qty, ref = "", targetAssetId, purchaseDate, purchaseLocation, destination } = req.body || {};
    const qRaw = Number(qty || 0);

    if (!["IN", "OUT", "ADJUST"].includes(type)) {
      return res.status(400).json({ error: "invalid type" });
    }
    
    if (!Number.isFinite(qRaw) || qRaw === 0) {
      return res.status(400).json({ error: "qty must be a non-zero number" });
    }

    // IN/OUT must be positive qty; ADJUST may be +/-, representing delta
    const qAbs = Math.abs(qRaw);
    if ((type === "IN" || type === "OUT") && qRaw <= 0) {
      return res.status(400).json({ error: "qty must be > 0" });
    }

    // ADJUST requires notes/ref
    if (type === "ADJUST" && !String(ref || "").trim()) {
      return res.status(400).json({ error: "notes/ref is required for ADJUST" });
    }

    // If OUT and targetAssetId provided, ensure asset exists
    let taId = null;
    if (type === "OUT" && targetAssetId) {
      taId = Number(targetAssetId);
      if (!Number.isFinite(taId)) return res.status(400).json({ error: "invalid targetAssetId" });
      const [[a]] = await conn.query(`SELECT id FROM assets WHERE id=?`, [taId]);
      if (!a) return res.status(400).json({ error: "target asset not found" });
    }

    await conn.beginTransaction();

    const [itemRows] = await conn.query(
      "SELECT id, stock, category, is_active AS isActive FROM inventory_items WHERE id=? FOR UPDATE",
      [id]
    );
    const item = Array.isArray(itemRows) ? itemRows[0] : null;
    if (!item) {
      await conn.rollback();
      return res.status(404).json({ error: "Inventory item not found" });
    }
    if (Number(item.isActive) === 0) {
      await conn.rollback();
      return res.status(400).json({ error: "Inventory item is disabled" });
    }

    let nextStock = Number(item.stock) || 0;

    // OUT extra validation: if category OTHER then destination is required
    if (type === "OUT" && String(item.category || "") === "OTHER") {
      if (!String(destination || "").trim()) {
        await conn.rollback();
        return res.status(400).json({ error: "destination is required for OUT when category is OTHER" });
      }
    }

    if (type === "IN") nextStock = nextStock + qAbs;
    if (type === "OUT") nextStock = nextStock - qAbs;
    if (type === "ADJUST") nextStock = nextStock + qRaw;

    if (nextStock < 0) {
      await conn.rollback();
      return res.status(400).json({ error: "stock would be negative" });
    }

    await conn.query(`UPDATE inventory_items SET stock=? WHERE id=?`, [
      nextStock,
      id,
    ]);

    await conn.query(
      `INSERT INTO inventory_movements (inventory_item_id, type, qty, ref, created_by, target_asset_id, purchase_date, purchase_location, destination)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        type,
        type === "ADJUST" ? qRaw : qAbs,
        ref || null,
        req.user?.username || null,
        taId,
        purchaseDate ? String(purchaseDate) : null,
        purchaseLocation ?? null,
        destination ?? null,
      ]
    );

    await conn.commit();

    // Activity logs (inventory)
    await logActivity({
      req,
      action: "INV_MOVE",
      entityType: "INVENTORY",
      entityId: id,
      meta: { type, qty: (type === "ADJUST" ? qRaw : qAbs), ref, purchaseDate: purchaseDate ?? null, purchaseLocation: purchaseLocation ?? null, destination: destination ?? null, createdBy: req.user?.username, stockAfter: nextStock, targetAssetId: taId ? String(taId) : null },
    });

    // If linked to asset, log also on ASSET entity (so AssetHistoryModal can display)
    if (taId) {
      await logActivity({
        req,
        action: "INV_MOVE",
        entityType: "ASSET",
        entityId: taId,
        meta: { inventoryItemId: String(id), type, qty: (type === "ADJUST" ? qRaw : qAbs), ref, purchaseDate: purchaseDate ?? null, purchaseLocation: purchaseLocation ?? null, destination: destination ?? null, createdBy: req.user?.username },
      });
    }

    const [[row]] = await pool.query(
      `SELECT id,
              sku,
              name,
              category,
              unit,
              location,
              capacity,
              stock,
              min_stock AS minStock,
              notes,
              created_at AS createdAt,
              updated_at AS updatedAt,
              is_active AS isActive,
              disabled_at AS disabledAt,
              disabled_by AS disabledBy,
              disabled_reason AS disabledReason
       FROM inventory_items WHERE id=?`,
      [id]
    );

    // realtime broadcast
    sseBroadcast("inventory_changed", {
      action: "move",
      entityId: String(id),
      by: req.user?.username || null,
      ts: Date.now(),
      moveType: type,
      qty: (type === "ADJUST" ? qRaw : qAbs),
      targetAssetId: taId ? String(taId) : null,
      stockAfter: row?.stock ?? null,
    });

    // if linked to asset, also refresh assets page
    if (taId) {
      sseBroadcast("assets_changed", {
        action: "inv_move",
        entityId: String(taId),
        by: req.user?.username || null,
        ts: Date.now(),
      });
    }
    sseBroadcast("dashboard_changed", { ts: Date.now() });

    res.json({ ...row, id: String(row.id) });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    console.error(err);
    res.status(500).json({ error: "Failed to move inventory stock" });
  } finally {
    conn.release();
  }
});

// ----- Inventory movements list -----
// GET /api/inventory/:id/movements?limit=100&offset=0
app.get("/api/inventory/:id/movements", authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);

    const [[exists]] = await pool.query(`SELECT id FROM inventory_items WHERE id=?`, [id]);
    if (!exists) return res.status(404).json({ error: "Inventory item not found" });

    const [rows] = await pool.query(
      `SELECT m.id,
              m.inventory_item_id AS inventoryItemId,
              m.type,
              m.qty,
              m.ref,
              m.created_by AS createdBy,
              m.target_asset_id AS targetAssetId,
              m.purchase_date AS purchaseDate,
              m.purchase_location AS purchaseLocation,
              m.destination AS destination,
              a.asset_tag AS targetAssetTag,
              a.name AS targetAssetName,
              m.created_at AS createdAt
       FROM inventory_movements m
       LEFT JOIN assets a ON a.id = m.target_asset_id
       WHERE m.inventory_item_id=?
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT ? OFFSET ?`,
      [id, limit, offset]
    );

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM inventory_movements WHERE inventory_item_id=?`,
      [id]
    );

    const mapped = rows.map((r) => ({
      ...r,
      id: String(r.id),
      inventoryItemId: String(r.inventoryItemId),
      targetAssetId: r.targetAssetId !== null && r.targetAssetId !== undefined ? String(r.targetAssetId) : undefined,
    }));

    res.json({
      itemId: String(id),
      total: Number(countRow.total) || 0,
      limit,
      offset,
      movements: mapped,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load inventory movements" });
  }
});

// ----- Activity logs (admin only) -----
// GET /api/activity?limit=100&offset=0&actor=&entityType=&entityId=
app.get("/api/activity", authenticate, adminOnly, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);

    const actor = String(req.query.actor ?? "");
    const entityType = String(req.query.entityType ?? "");
    const entityId =
      req.query.entityId !== undefined ? Number(req.query.entityId) : null;

    const where = [];
    const params = [];

    if (actor) { where.push(`actor_username = ?`); params.push(actor); }
    if (entityType) { where.push(`entity_type = ?`); params.push(entityType); }
    if (entityId && Number.isFinite(entityId)) { where.push(`entity_id = ?`); params.push(entityId); }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT id,
              actor_username AS actorUsername,
              actor_user_id AS actorUserId,
              action,
              entity_type AS entityType,
              entity_id AS entityId,
              meta,
              created_at AS createdAt
       FROM activity_logs
       ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM activity_logs ${whereSql}`,
      params
    );

    res.json({
      total: Number(countRow.total) || 0,
      limit,
      offset,
      logs: rows.map((r) => ({ ...r, id: String(r.id), entityId: r.entityId ? String(r.entityId) : null, meta: r.meta ? (typeof r.meta === 'string' ? JSON.parse(r.meta) : r.meta) : null })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load activity logs" });
  }
});

// ----- Utility Endpoints -----
// Endpoint untuk generate asset tag (preview)
app.get("/api/assets/generate-tag", authenticate, async (req, res) => {
  try {
    const location = req.query.location || "";
    const assetTag = await generateAssetTag(String(location));
    res.json({ assetTag });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate asset tag" });
  }
});

// Endpoint untuk generate SKU (preview)
app.get("/api/inventory/generate-sku", authenticate, async (req, res) => {
  try {
    const name = req.query.name || "";
    const category = req.query.category || "";
    const sku = await generateSKU(String(name), String(category));
    res.json({ sku });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate SKU" });
  }
});

// ----- Toner CRUD -----
app.get("/api/toner", authenticate, async (req, res) => {
  try {
    const { search = "", status = "", origin = "", location = "", active = "1" } = req.query;
    const q = `%${String(search)}%`;

    const where = [];
    const params = [];

    if (search) {
      where.push(`(toner_serial LIKE ? OR name LIKE ? OR model LIKE ?)`);
      params.push(q, q, q);
    }
    if (status) {
      where.push(`status = ?`);
      params.push(String(status));
    }
    if (origin) {
      where.push(`origin = ?`);
      params.push(String(origin));
    }
    if (location) {
      where.push(`location = ?`);
      params.push(String(location));
    }
    
    // soft-delete filter
    if (active && String(active) !== "all") {
      where.push(`is_active = ?`);
      params.push(String(active) === "1" ? 1 : 0);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT id,
              toner_serial AS tonerSerial,
              name,
              model,
              vendor,
              origin,
              location,
              status,
              notes,
              created_by AS createdBy,
              updated_by AS updatedBy,
              created_at AS createdAt,
              updated_at AS updatedAt,
              is_active AS isActive,
              disabled_at AS disabledAt,
              disabled_by AS disabledBy,
              disabled_reason AS disabledReason
       FROM toner
       ${whereSql}
       ORDER BY updated_at DESC, id DESC`,
      params
    );

    res.json(rows.map((r) => ({ ...r, id: String(r.id) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load toner" });
  }
});

// GET /api/toner/next-serial
app.get("/api/toner/next-serial", authenticate, async (req, res) => {
  try {
    const nextSerial = await generateTonerSerial();
    res.json({ nextSerial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate next serial" });
  }
});

app.post("/api/toner", authenticate, adminOnly, async (req, res) => {
  try {
    const {
      name,
      model,
      vendor,
      origin,
      location,
      status = "PENDING",
      notes,
    } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    // Generate serial otomatis
    const tonerSerial = await generateTonerSerial();

    const [result] = await pool.query(
      `INSERT INTO toner (
         toner_serial, name, model, vendor, origin, location, status, notes, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tonerSerial,
        String(name),
        model ?? null,
        vendor ?? null,
        origin ?? null,
        location ?? null,
        String(status),
        notes ?? null,
        req.user?.username || null,
      ]
    );

    const id = String(result.insertId);
    await logActivity({
      req,
      action: "TONER_CREATE",
      entityType: "TONER",
      entityId: id,
      meta: { 
        type: "TONER",
        tonerSerial, 
        name,
        model,
        vendor,
        origin,
        location,
        status
      },
    });

    sseBroadcast("toner_changed", {
      action: "create",
      entityId: id,
      by: req.user?.username || null,
      ts: Date.now(),
    });

    res.json({ id, tonerSerial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create toner" });
  }
});

app.put("/api/toner/:id", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "invalid id" });
    }

    const payload = req.body || {};

    // Get before data
    const [rows] = await pool.query(
      `SELECT toner_serial, name, model, vendor, origin, location, status, notes
       FROM toner WHERE id = ?`,
      [id]
    );
    const beforeRow = Array.isArray(rows) ? rows[0] : null;

    // Update - toner_serial tidak bisa diubah
    await pool.query(
      `UPDATE toner SET
         name         = COALESCE(?, name),
         model        = COALESCE(?, model),
         vendor       = COALESCE(?, vendor),
         origin       = COALESCE(?, origin),
         location     = COALESCE(?, location),
         status       = COALESCE(?, status),
         notes        = ?,
         updated_by   = ?
       WHERE id = ?`,
      [
        payload.name ?? null,
        payload.model ?? null,
        payload.vendor ?? null,
        payload.origin ?? null,
        payload.location ?? null,
        payload.status ?? null,
        payload.notes ?? null,
        req.user?.username || null,
        id,
      ]
    );

    // Activity log
    let meta = payload;
    if (beforeRow) {
      const before = {
        tonerSerial: beforeRow.toner_serial,
        name: beforeRow.name,
        model: beforeRow.model,
        vendor: beforeRow.vendor,
        origin: beforeRow.origin,
        location: beforeRow.location,
        status: beforeRow.status,
        notes: beforeRow.notes,
      };

      const after = {
        tonerSerial: beforeRow.toner_serial, // Tetap sama
        name: payload.name ?? before.name,
        model: payload.model ?? before.model,
        vendor: payload.vendor ?? before.vendor,
        origin: payload.origin ?? before.origin,
        location: payload.location ?? before.location,
        status: payload.status ?? before.status,
        notes: payload.notes ?? before.notes,
      };

      meta = { before, after };
    }

    await logActivity({
      req,
      action: "TONER_UPDATE",
      entityType: "TONER",
      entityId: id,
      meta,
    });

    sseBroadcast("toner_changed", {
      action: "update",
      entityId: String(id),
      by: req.user?.username || null,
      ts: Date.now(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update toner" });
  }
});

app.post("/api/toner/:id/move", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "invalid id" });
    }

    const { status, location, notes } = req.body || {};

    // Get before data
    const [[beforeRow]] = await pool.query(
      `SELECT status, location, notes FROM toner WHERE id = ?`,
      [id]
    );

    // Update
    await pool.query(
      `UPDATE toner SET
         status   = COALESCE(?, status),
         location = COALESCE(?, location),
         notes    = COALESCE(?, notes),
         updated_by = ?
       WHERE id = ?`,
      [
        status ?? null,
        location ?? null,
        notes ?? null,
        req.user?.username || null,
        id,
      ]
    );

    // Activity log
    const meta = {
      before: beforeRow ? {
        status: beforeRow.status,
        location: beforeRow.location,
        notes: beforeRow.notes,
      } : null,
      after: {
        status: status ?? beforeRow?.status,
        location: location ?? beforeRow?.location,
        notes: notes ?? beforeRow?.notes,
      },
    };

    await logActivity({
      req,
      action: "TONER_MOVE",
      entityType: "TONER",
      entityId: id,
      meta: { ...meta, type: "TONER_MOVE" },
    });

    sseBroadcast("toner_changed", {
      action: "move",
      entityId: String(id),
      by: req.user?.username || null,
      ts: Date.now(),
      newStatus: status,
      newLocation: location,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to move toner" });
  }
});

app.post("/api/toner/:id/disable", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = (req.body?.reason || "").trim();
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    if (!reason) return res.status(400).json({ error: "reason is required" });

    const [r] = await pool.query(
      `UPDATE toner
       SET is_active = 0,
           disabled_at = NOW(),
           disabled_by = ?,
           disabled_reason = ?,
           updated_by = ?
       WHERE id = ?`,
      [req.user?.username || null, reason, req.user?.username || null, id]
    );

    if (r?.affectedRows === 0) return res.status(404).json({ error: "not found" });

    await logActivity({
      req,
      action: "TONER_DELETE",
      entityType: "TONER",
      entityId: id,
      meta: { soft: true, reason, type: "TONER" },
    });

    sseBroadcast("toner_changed", {
      action: "disable",
      entityId: String(id),
      by: req.user?.username || null,
      ts: Date.now(),
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "failed to disable" });
  }
});

app.post("/api/toner/:id/restore", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const [r] = await pool.query(
      `UPDATE toner
       SET is_active = 1,
           disabled_at = NULL,
           disabled_by = NULL,
           disabled_reason = NULL,
           updated_by = ?
       WHERE id = ?`,
      [req.user?.username || null, id]
    );

    if (r?.affectedRows === 0) return res.status(404).json({ error: "not found" });

    await logActivity({
      req,
      action: "TONER_UPDATE",
      entityType: "TONER",
      entityId: id,
      meta: { restored: true, type: "TONER" },
    });

    sseBroadcast("toner_changed", {
      action: "restore",
      entityId: String(id),
      by: req.user?.username || null,
      ts: Date.now(),
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "failed to restore" });
  }
});

// =======================================================
// USER MANAGEMENT
// =======================================================

// Get current user info
app.get("/api/users/me", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        id,
        username,
        role,
        created_at AS createdAt,
        is_active AS isActive,
        disabled_at AS disabledAt,
        disabled_by AS disabledBy,
        disabled_reason AS disabledReason
       FROM users WHERE username = ?`,
      [req.user?.username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    res.json({
      ...user,
      id: String(user.id),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get user info" });
  }
});

// List users (admin only)
app.get("/api/users", authenticate, adminOnly, async (req, res) => {
  try {
    const { search = "", role = "", active = "1" } = req.query;
    const q = `%${String(search)}%`;

    const where = [];
    const params = [];

    if (search) {
      where.push(`(username LIKE ?)`);
      params.push(q);
    }
    if (role) {
      where.push(`role = ?`);
      params.push(String(role));
    }
    if (active && String(active) !== "all") {
      where.push(`is_active = ?`);
      params.push(String(active) === "1" ? 1 : 0);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT 
        id,
        username,
        role,
        created_at AS createdAt,
        is_active AS isActive,
        disabled_at AS disabledAt,
        disabled_by AS disabledBy,
        disabled_reason AS disabledReason
       FROM users
       ${whereSql}
       ORDER BY username ASC`,
      params
    );

    res.json(rows.map((r) => ({ ...r, id: String(r.id) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

// Create user (admin only)
app.post("/api/users", authenticate, adminOnly, async (req, res) => {
  try {
    const { username, password, role = "user" } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Check if username exists
    const [existing] = await pool.query("SELECT id FROM users WHERE username = ?", [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, hash, role]
    );

    const id = String(result.insertId);

    // Activity log
    await logActivity({
      req,
      action: "USER_CREATE",
      entityType: "USER",
      entityId: id,
      meta: { username, role },
    });

    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update user (admin only)
app.put("/api/users/:id", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "invalid id" });
    }

    const { username, password, role } = req.body || {};

    // Check if user exists
    const [[user]] = await pool.query("SELECT username FROM users WHERE id = ?", [id]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If changing username, check if new username exists
    if (username && username !== user.username) {
      const [existing] = await pool.query("SELECT id FROM users WHERE username = ? AND id != ?", [username, id]);
      if (existing.length > 0) {
        return res.status(400).json({ error: "Username already exists" });
      }
    }

    const updates = [];
    const params = [];

    if (username) {
      updates.push("username = ?");
      params.push(username);
    }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push("password = ?");
      params.push(hash);
    }

    if (role) {
      updates.push("role = ?");
      params.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id);

    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    // Activity log
    await logActivity({
      req,
      action: "USER_UPDATE",
      entityType: "USER",
      entityId: id,
      meta: { username, role, passwordChanged: !!password },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Change password
app.post("/api/users/:id/change-password", authenticate, async (req, res) => {
  try {
    console.log("=== CHANGE PASSWORD REQUEST ===");
    console.log("User making request:", req.user);
    console.log("Target user ID:", req.params.id);

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "invalid id" });
    }

    const { newPassword } = req.body || {}; // Hanya ambil newPassword saja

    if (!newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }

    // Check if user exists
    const [[user]] = await pool.query(
      "SELECT id, username, role, is_active FROM users WHERE id = ?", 
      [id]
    );
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is active
    if (user.is_active === 0) {
      return res.status(400).json({ error: "User account is disabled" });
    }

    const isSelf = String(user.id) === String(req.user?.id);
    const isAdminUser = req.user?.role === "admin";

    // Authorization logic
    if (!isSelf && !isAdminUser) {
      return res.status(403).json({ 
        error: "You are not authorized to change this password" 
      });
    }

    // Validate new password strength
    if (newPassword.length < 4) {
      return res.status(400).json({ 
        error: "New password must be at least 4 characters" 
      });
    }

    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?",
      [hash, id]
    );

    // Activity log
    await logActivity({
      req,
      action: "USER_UPDATE",
      entityType: "USER",
      entityId: id,
      meta: { 
        passwordChanged: true, 
        changedBy: req.user?.username,
        isSelfChange: isSelf,
        targetUsername: user.username 
      },
    });

    console.log("Password changed successfully for user:", user.username);
    res.json({ 
      success: true, 
      message: "Password changed successfully" 
    });
    
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

// Disable user (admin only)
app.post("/api/users/:id/disable", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = (req.body?.reason || "").trim();
    
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    if (!reason) return res.status(400).json({ error: "reason is required" });

    // Cannot disable self
    if (String(id) === String(req.user?.id)) {
      return res.status(400).json({ error: "Cannot disable your own account" });
    }

    const [r] = await pool.query(
      `UPDATE users
       SET is_active = 0,
           disabled_at = NOW(),
           disabled_by = ?,
           disabled_reason = ?
       WHERE id = ?`,
      [req.user?.id || null, reason, id]
    );

    if (r?.affectedRows === 0) return res.status(404).json({ error: "not found" });

    await logActivity({
      req,
      action: "USER_DELETE",
      entityType: "USER",
      entityId: id,
      meta: { soft: true, reason },
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "failed to disable user" });
  }
});

// Restore user (admin only)
app.post("/api/users/:id/restore", authenticate, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const [r] = await pool.query(
      `UPDATE users
       SET is_active = 1,
           disabled_at = NULL,
           disabled_by = NULL,
           disabled_reason = NULL
       WHERE id = ?`,
      [id]
    );

    if (r?.affectedRows === 0) return res.status(404).json({ error: "not found" });

    await logActivity({
      req,
      action: "USER_UPDATE",
      entityType: "USER",
      entityId: id,
      meta: { restored: true },
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "failed to restore user" });
  }
});

// =======================================================
// STORAGE (DIAGRAMS ONLY, FILESYSTEM)
// =======================================================
const STORAGE_ENABLED = process.env.STORAGE_ENABLED !== "false";
const STORAGE_PATH = process.env.STORAGE_PATH || "./storage";
const ENABLE_GIT_BACKUP = process.env.ENABLE_GIT_BACKUP === "true";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_PATH);
  } catch {
    await fs.mkdir(STORAGE_PATH, { recursive: true });
  }
}

if (STORAGE_ENABLED) {
  ensureStorageDir().catch(console.error);

  // ===== READ (USER + ADMIN) =====
  app.get("/api/diagrams", authenticate, async (req, res) => {
    try {
      const files = await fs.readdir(STORAGE_PATH);
      const diagrams = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(STORAGE_PATH, file);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, "utf-8");
          const data = JSON.parse(content);

          diagrams.push({
            id: file.replace(".json", ""),
            name: data.name || "Untitled Diagram",
            lastModified: stats.mtime,
            size: stats.size,
          });
        }
      }

      res.json(diagrams);
    } catch (err) {
      res.status(500).json({ error: "Failed to list diagrams" });
    }
  });

  app.get("/api/diagrams/:id", authenticate, async (req, res) => {
    try {
      const filePath = path.join(STORAGE_PATH, `${req.params.id}.json`);
      const content = await fs.readFile(filePath, "utf-8");
      res.json(JSON.parse(content));
    } catch (err) {
      res.status(404).json({ error: "Diagram not found" });
    }
  });

  // ===== WRITE (ADMIN ONLY) =====
    app.post(
      "/api/diagrams",
      authenticate,
      adminOnly,
      async (req, res) => {
        try {
          const id = req.body.id || `diagram_${Date.now()}`;
          const filePath = path.join(STORAGE_PATH, `${id}.json`);
  
          const data = {
            ...req.body,
            id,
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
          };
  
          await fs.writeFile(filePath, JSON.stringify(data, null, 2));
          res.status(201).json({ success: true, id });
        } catch {
          res.status(500).json({ error: "Failed to create diagram" });
        }
      }
    );
    
    app.put("/api/diagrams/:id", authenticate, adminOnly, async (req, res) => {
      try {
        const id = req.params.id;
        const filePath = path.join(STORAGE_PATH, `${id}.json`);
        
        // Cek apakah file sudah ada
        try {
          await fs.access(filePath);
        } catch {
          return res.status(404).json({ error: "Diagram not found" });
        }
        
        // Gabungkan data lama dengan data baru (atau timpa total)
        const data = {
          ...req.body,
          id,
          lastModified: new Date().toISOString(),
        };
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        res.json({ success: true, id });
      } catch (err) {
        console.error("Failed to update diagram:", err);
        res.status(500).json({ error: "Failed to update diagram" });
      }
    });

  app.delete("/api/diagrams/:id", authenticate, adminOnly, async (req, res) => {
    try {
      const filePath = path.join(STORAGE_PATH, `${req.params.id}.json`);
      await fs.unlink(filePath);
      res.json({ success: true });
    } catch (err) {
      res.status(404).json({ error: "Diagram not found" });
    }
  });
}

// =======================================================
// ASSET HANDOVER (Surat Tanda Terima Asset)
// =======================================================
app.post("/api/assets/:id/handover", authenticate, adminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const assetId = Number(req.params.id);
    const { receiverName, receiverDivision, receiverPhone, handoverDate } = req.body || {};

    if (!Number.isFinite(assetId)) return res.status(400).json({ error: "invalid id" });
    if (!receiverName || !String(receiverName).trim()) return res.status(400).json({ error: "Nama penerima wajib diisi" });
    if (!receiverDivision || !String(receiverDivision).trim()) return res.status(400).json({ error: "Divisi penerima wajib diisi" });
    if (!receiverPhone || !String(receiverPhone).trim()) return res.status(400).json({ error: "No WA penerima wajib diisi" });

    const [assetRows] = await pool.query(
      `SELECT id, asset_tag AS assetTag, name, type, brand, model, serial_number AS serialNumber, status
       FROM assets WHERE id = ?`,
      [assetId]
    );
    const asset = assetRows?.[0];
    if (!asset) return res.status(404).json({ error: "Asset tidak ditemukan" });

    const now = new Date();
    const genMonth = now.getMonth() + 1;
    const genYear = now.getFullYear();
    const finalDate = (handoverDate && String(handoverDate).trim()) || now.toISOString().slice(0, 10);

    await conn.beginTransaction();

    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM asset_handovers WHERE gen_year = ? AND gen_month = ? FOR UPDATE`,
      [genYear, genMonth]
    );
    const seqNo = (Number(countRows?.[0]?.cnt) || 0) + 1;

    const pad2 = (n) => String(n).padStart(2, "0");
    const pad4 = (n) => String(n).padStart(4, "0");
    const handoverNumber = `ST/CJI/IT/${pad2(genMonth)}/${genYear}/${pad4(seqNo)}`;

    const [ins] = await conn.query(
      `INSERT INTO asset_handovers
         (handover_number, asset_id, handover_date, receiver_name, receiver_division, receiver_phone, handed_over_by, gen_month, gen_year, seq_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        handoverNumber,
        assetId,
        finalDate,
        String(receiverName).trim().toUpperCase(),
        String(receiverDivision).trim().toUpperCase(),
        String(receiverPhone).trim(),
        req.user?.username || null,
        genMonth,
        genYear,
        seqNo,
      ]
    );

    await conn.commit();

    await logActivity({
      req,
      action: "ASSET_HANDOVER",
      entityType: "ASSET",
      entityId: assetId,
      meta: { handoverNumber, receiverName, receiverDivision, receiverPhone },
    });

    res.json({
      id: String(ins.insertId),
      handoverNumber,
      handoverDate: finalDate,
      receiverName: String(receiverName).trim().toUpperCase(),
      receiverDivision: String(receiverDivision).trim().toUpperCase(),
      receiverPhone: String(receiverPhone).trim(),
      handedOverBy: req.user?.username || "-",
      asset,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Failed to create handover" });
  } finally {
    conn.release();
  }
});

// =======================================================
// SERVER
// =======================================================
const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`Backend listening on :${PORT}`);
});
