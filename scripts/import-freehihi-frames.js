const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const API_URL = 'https://photo.freehihi.com/api/frame?frame=square';
const CDN_BASE_URL = 'https://cdn.freehihi.com';

const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'frames');
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
  fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        fs.unlink(destPath, () => {});
        reject(new Error(`Failed to download ${url}, status code: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log(`📡 Fetching frame metadata from ${API_URL}...`);
  const framesList = await fetchJson(API_URL);

  if (!Array.isArray(framesList)) {
    console.error('❌ Expected array of frames, got:', framesList);
    return;
  }

  console.log(`🔍 Total frames found: ${framesList.length}`);

  // Load existing memory database
  let memDb = {
    admins: [],
    frames: [],
    sessions: [],
    photos: [],
    settings: {},
    auditLogs: [],
    analyticsEvents: [],
  };

  if (fs.existsSync(DB_FILE)) {
    try {
      memDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch {}
  }

  if (!memDb.frames) memDb.frames = [];

  const existingMap = new Map();
  memDb.frames.forEach((f) => existingMap.set(f._id || f.name, f));

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < framesList.length; i++) {
    const item = framesList[i];
    const filename = item.filename;
    const frameName = item.name || filename.replace(/\.[^/.]+$/, '');
    const categoryName = item.category?.name || 'General';
    const cdnUrl = `${CDN_BASE_URL}/${filename}`;
    const localFilePath = path.join(PUBLIC_UPLOADS_DIR, filename);

    console.log(`[${i + 1}/${framesList.length}] Downloading ${frameName} (${filename})...`);

    try {
      if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size < 100) {
        await downloadFile(cdnUrl, localFilePath);
      }

      const frameUrl = `/api/uploads/frames/${filename}`;
      const r2Key = `frames/${filename}`;

      const frameObj = {
        _id: `freehihi_${item.id}`,
        name: frameName,
        description: `Imported frame from FreeHiHi (${categoryName})`,
        category: categoryName,
        resolution: { width: 1200, height: 1800 },
        aspectRatio: '4:6',
        layoutMode: 'single',
        slots: [
          { x: 60, y: 60, width: 1080, height: 1680, rotation: 0 }
        ],
        thumbnailUrl: frameUrl,
        previewUrl: frameUrl,
        frameUrl,
        r2Key,
        enabled: true,
        isPinned: false,
        displayOrder: i + 1,
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.updated_at || new Date().toISOString(),
      };

      existingMap.set(frameObj._id, frameObj);
      successCount++;
    } catch (err) {
      console.warn(`⚠️ Failed to download/process ${filename}:`, err.message);
      failCount++;
    }
  }

  memDb.frames = Array.from(existingMap.values());

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(memDb, null, 2), 'utf-8');

  console.log(`\n🎉 Import Complete!`);
  console.log(`✅ Success: ${successCount} frames downloaded and saved to data/local_db.json`);
  if (failCount > 0) {
    console.log(`⚠️ Failed: ${failCount} frames`);
  }
}

main().catch(console.error);
