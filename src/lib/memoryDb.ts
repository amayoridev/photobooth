import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

export interface MemoryDB {
  admins: any[];
  frames: any[];
  sessions: any[];
  photos: any[];
  settings: Record<string, any>;
  branding?: any;
  auditLogs: any[];
  analyticsEvents: any[];
}

const DEFAULT_ADMIN_HASH = bcrypt.hashSync('admin', 10);
const DEFAULT_ADMIN_FULL_HASH = bcrypt.hashSync('admin123456', 10);

const DEFAULT_DB: MemoryDB = {
  admins: [
    {
      _id: 'admin_short_1',
      email: 'admin',
      passwordHash: DEFAULT_ADMIN_HASH,
      name: 'Administrator',
      role: 'superadmin',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'admin_super_1',
      email: 'admin@photobooth.com',
      passwordHash: DEFAULT_ADMIN_FULL_HASH,
      name: 'Super Administrator',
      role: 'superadmin',
      createdAt: new Date().toISOString(),
    },
  ],
  frames: [],
  sessions: [],
  photos: [],
  settings: {},
  auditLogs: [],
  analyticsEvents: [],
};

function ensureDbFile(): MemoryDB {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    return DEFAULT_DB;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    // Ensure admin user with email "admin" exists
    if (!parsed.admins || !parsed.admins.some((a: any) => a.email === 'admin')) {
      if (!parsed.admins) parsed.admins = [];
      parsed.admins.push({
        _id: 'admin_short_1',
        email: 'admin',
        passwordHash: DEFAULT_ADMIN_HASH,
        name: 'Administrator',
        role: 'superadmin',
        createdAt: new Date().toISOString(),
      });
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch {
    return DEFAULT_DB;
  }
}

export function getMemoryDB(): MemoryDB {
  return ensureDbFile();
}

export function saveMemoryDB(db: MemoryDB) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}
