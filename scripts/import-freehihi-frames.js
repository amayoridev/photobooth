const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ENDPOINTS = [
  'https://photo.freehihi.com/api/frame?frame=square',
  'https://photo.freehihi.com/api/frame?frame=bigrectangle',
  'https://photo.freehihi.com/api/frame?frame=rectangle',
  'https://photo.freehihi.com/api/frame?frame=strip',
];

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
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
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
  let allFramesList = [];

  for (const endpoint of ENDPOINTS) {
    console.log(`📡 Fetching frame metadata from ${endpoint}...`);
    const list = await fetchJson(endpoint);
    if (Array.isArray(list)) {
      console.log(`   Found ${list.length} frames.`);
      allFramesList.push(...list);
    }
  }

  // Deduplicate by ID / filename
  const uniqueFrames = new Map();
  allFramesList.forEach((item) => {
    if (item.filename) {
      uniqueFrames.set(item.filename, item);
    }
  });

  const framesList = Array.from(uniqueFrames.values());
  console.log(`\n🔍 Total unique frames found across all categories: ${framesList.length}`);

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

    const frameType = item.frame || 'square';
    const isRectangle = frameType === 'bigrectangle' || frameType === 'rectangle';
    const width = isRectangle ? 1800 : 1200;
    const height = isRectangle ? 1200 : 1800;
    const aspectRatio = isRectangle ? '6:4' : '4:6';

    try {
      if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size < 100) {
        await downloadFile(cdnUrl, localFilePath);
      }

      const frameUrl = `/api/uploads/frames/${filename}`;
      const r2Key = `frames/${filename}`;

      const frameObj = {
        _id: `freehihi_${item.id}`,
        name: `${frameName}${isRectangle ? ' (Rect)' : ''}`,
        description: `Imported frame from FreeHiHi (${categoryName} - ${frameType})`,
        category: categoryName,
        resolution: { width, height },
        aspectRatio,
        layoutMode: isRectangle ? 'horizontal_strip' : 'single',
        slots: [
          { x: 60, y: 60, width: width - 120, height: height - 120, rotation: 0 }
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

  console.log(`\n🎉 Multi-Category Import Complete!`);
  console.log(`✅ Success: ${successCount} total frames downloaded and saved to data/local_db.json`);
  if (failCount > 0) {
    console.log(`⚠️ Failed: ${failCount} frames`);
  }
}

main().catch(console.error);
