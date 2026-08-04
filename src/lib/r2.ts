import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
    });
  } catch {
    s3Client = null;
  }
}

/**
 * Uploads a file buffer or base64 string to local storage AND Cloudflare R2 simultaneously.
 */
export async function uploadToR2(
  fileBuffer: Buffer | string,
  key: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  const buffer = typeof fileBuffer === 'string'
    ? Buffer.from(fileBuffer.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    : fileBuffer;

  // 1. ALWAYS write copy to local disk first
  const localUploadDir = path.join(process.cwd(), 'public', 'uploads', path.dirname(key));
  if (!fs.existsSync(localUploadDir)) {
    fs.mkdirSync(localUploadDir, { recursive: true });
  }

  const localFilePath = path.join(process.cwd(), 'public', 'uploads', key);
  fs.writeFileSync(localFilePath, buffer);

  const localUrl = `/api/uploads/${key}`;

  // 2. ALSO upload to Cloudflare R2 if configured
  if (isR2Configured && s3Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await s3Client.send(command);

      const publicUrl = R2_PUBLIC_DOMAIN
        ? `${R2_PUBLIC_DOMAIN.replace(/\/$/, '')}/${key}`
        : localUrl;

      return { url: publicUrl, key };
    } catch (err: any) {
      console.warn(`⚠️ R2 upload warning (${err.message || 'Signature mismatch'}). Falling back to local URL.`);
    }
  }

  return { url: localUrl, key };
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
      return true;
    } catch (err) {
      console.error('Cloudflare R2 delete error:', err);
    }
  }

  try {
    const localFilePath = path.join(process.cwd(), 'public', 'uploads', key);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
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
