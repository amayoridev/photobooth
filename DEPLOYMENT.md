# Production Deployment Guide

This guide details how to deploy **Antigravity PhotoBooth** to Vercel, Railway, Docker, or custom VPS instances.

---

## 1. Prerequisites
- MongoDB Atlas cluster URI (`mongodb+srv://...`)
- Cloudflare R2 bucket with S3 API credentials (Account ID, Access Key ID, Secret Access Key)
- Custom domain (e.g. `https://photobooth.yourdomain.com`)

---

## 2. Deploying to Vercel

1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Configure Environment Variables under **Project Settings > Environment Variables**:
   - `MONGODB_URI`
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_DOMAIN`
   - `JWT_SECRET`
4. Click **Deploy**.
5. Once deployed, run the seed script remotely or connect locally using your production `MONGODB_URI`:
   ```bash
   MONGODB_URI="mongodb+srv://..." npx tsx scripts/seed-admin.ts
   ```

---

## 3. Docker Container Deployment

1. Build and run using Docker Compose:
   ```bash
   docker-compose up -d --build
   ```
2. The application will be accessible on `http://localhost:3000`.

---

## 4. Verification Checklist
- [x] Admin login at `/admin/login` using seeded credentials.
- [x] Upload transparent PNG frame at `/admin/frames`.
- [x] Test webcam capture, countdown, and mirror mode at `/booth`.
- [x] Verify final photo collage render and Cloudflare R2 upload.
- [x] Scan QR code on mobile device and download photo from `/share/{token}`.
