import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'moimoi';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || '';

const isR2Configured = Boolean(
  R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    !R2_ACCESS_KEY_ID.includes('YOUR_') &&
    !R2_SECRET_ACCESS_KEY.includes('YOUR_')
);

// High performance S3 HTTP Keep-Alive agent to reuse TCP/TLS sockets across uploads
const requestHandler = new NodeHttpHandler({
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 30000 }),
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 30000 }),
  connectionTimeout: 8000,
  requestTimeout: 60000,
});

let s3Client: S3Client | null = null;

if (isR2Configured) {
  try {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
      requestHandler,
    });
  } catch {
    s3Client = null;
  }
}

/**
 * Uploads a file buffer or base64 string to local storage AND Cloudflare R2 concurrently with HTTP Keep-Alive.
 */
export async function uploadToR2(
  fileBuffer: Buffer | string,
  key: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  const buffer = typeof fileBuffer === 'string'
    ? Buffer.from(fileBuffer.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    : fileBuffer;

  const localUploadDir = path.join(process.cwd(), 'public', 'uploads', path.dirname(key));
  const localFilePath = path.join(process.cwd(), 'public', 'uploads', key);
  const localUrl = `/api/uploads/${key}`;

  // 1. Asynchronous local file write
  const writeLocalPromise = (async () => {
    try {
      if (!fs.existsSync(localUploadDir)) {
        await fs.promises.mkdir(localUploadDir, { recursive: true });
      }
      await fs.promises.writeFile(localFilePath, buffer);
    } catch (err) {
      console.warn('Local disk write warning:', err);
    }
  })();

  // 2. Parallel Cloudflare R2 upload with persistent S3 Keep-Alive client
  let finalUrl = localUrl;

  if (isR2Configured && s3Client) {
    const uploadR2Promise = (async () => {
      try {
        const command = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        });

        await s3Client.send(command);

        if (R2_PUBLIC_DOMAIN) {
          finalUrl = `${R2_PUBLIC_DOMAIN.replace(/\/$/, '')}/${key}`;
        }
      } catch (err: any) {
        console.warn(`⚠️ R2 upload warning (${err.message || 'Upload error'}). Falling back to local URL.`);
      }
    })();

    await Promise.all([writeLocalPromise, uploadR2Promise]);
  } else {
    await writeLocalPromise;
  }

  return { url: finalUrl, key };
}

/**
 * Deletes an object from Cloudflare R2 or local filesystem fallback.
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  if (isR2Configured && s3Client) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });
      await s3Client.send(command);
    } catch (err) {
      console.error('Cloudflare R2 delete error:', err);
    }
  }

  try {
    const localFilePath = path.join(process.cwd(), 'public', 'uploads', key);
    if (fs.existsSync(localFilePath)) {
      await fs.promises.unlink(localFilePath);
    }
    return true;
  } catch (err) {
    console.error('Local file delete error:', err);
    return false;
  }
}

/**
 * Generates a presigned download or view URL for an R2 object.
 */
export async function getPresignedR2Url(key: string, expiresInSeconds: number = 3600): Promise<string> {
  if (isR2Configured && s3Client) {
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    } catch {
      // fallback
    }
  }

  return `/uploads/${key}`;
}
