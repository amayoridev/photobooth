import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

interface FreehihiFrameItem {
  id: number;
  filename: string;
  name: string;
  frame: string;
  layout_type?: string;
  category?: {
    id: number;
    name: string;
  };
}

const API_URL = 'https://photo.freehihi.com/api/frame?frame=square';
const OUTPUT_DIR = path.join(process.cwd(), 'downloads', 'freehihi-frames');

// Common CDN domain candidates
const CDN_DOMAINS = [
  'https://cdn.freeahihi.com',
  'https://cdn.freehihi.com/uploads/frames',
  'https://cdn.freehihi.com',
];

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://photo.freehihi.com/',
          Accept: 'application/json, text/plain, */*',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON response: ${e}`));
          }
        });
      }
    );
    req.on('error', reject);
  });
}

function downloadFile(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://photo.freehihi.com/',
        },
      },
      (res) => {
        if (res.statusCode === 200) {
          const fileStream = fs.createWriteStream(destPath);
          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(true);
          });
        } else {
          resolve(false);
        }
      }
    );
    req.on('error', () => resolve(false));
  });
}

async function main() {
  console.log(`🔍 Fetching frame list from: ${API_URL}`);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    const items: FreehihiFrameItem[] = await fetchJson(API_URL);
    console.log(`📦 Found ${items.length} frame items.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const filename = item.filename;
      const sanitizeName = (item.name || `frame_${item.id}`)
        .replace(/[/\\?%*:|"<>]/g, '_')
        .trim();
      
      const localFileName = `${item.id}_${sanitizeName}_${filename}`;
      const destPath = path.join(OUTPUT_DIR, localFileName);

      if (fs.existsSync(destPath)) {
        console.log(`[${i + 1}/${items.length}] ⏭️  Skipping existing: ${localFileName}`);
        successCount++;
        continue;
      }

      let downloaded = false;
      // Try CDN domain patterns
      for (const domain of CDN_DOMAINS) {
        const fileUrl = `${domain}/${filename}`;
        downloaded = await downloadFile(fileUrl, destPath);
        if (downloaded) {
          console.log(`[${i + 1}/${items.length}] ✅ Downloaded: ${localFileName} (from ${domain})`);
          break;
        }
      }

      if (downloaded) {
        successCount++;
      } else {
        console.error(`[${i + 1}/${items.length}] ❌ Failed to download: ${filename}`);
        failCount++;
      }

      // Small delay to prevent rate limits
      await new Promise((r) => setTimeout(r, 150));
    }

    console.log('\n========================================');
    console.log(`🎉 Download summary: ${successCount} downloaded successfully, ${failCount} failed.`);
    console.log(`📁 Files saved to: ${OUTPUT_DIR}`);
    console.log('========================================\n');
  } catch (err) {
    console.error('❌ Script execution error:', err);
  }
}

main();
