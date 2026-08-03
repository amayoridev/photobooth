# Antigravity PhotoBooth — Digital PhotoBooth Platform

A modern, production-grade, digital-only PhotoBooth platform built with Next.js 15 (App Router), React 19, TypeScript, MongoDB Atlas (Mongoose), Cloudflare R2 storage, HTML5 Canvas image compositor, and instant QR Code sharing.

---

## 🌟 Key Features

### 📸 Public User Experience
- **Frame Selection**: Responsive, filterable grid of designer transparent frames (Single, 2-Photo, 4-Photo Grid, Film Strip, Polaroid).
- **Live Camera Feed**: Browser MediaDevices API support for desktop, tablet, and mobile browsers.
  - Front vs. rear camera toggle
  - Mirror preview toggle
  - Countdown timer selection (3s, 5s, 10s)
  - Synthetic Web Audio API shutter sound effect
  - Flash animation visual feedback
  - Live transparent frame overlay on camera video
- **Canvas Composition**: High-res rendering with overlay alignment, optional timestamp, watermark text, and logo.
- **Cloudflare R2 Storage**: Direct AWS S3 SDK integration for streaming uploads into R2 storage (`/frames`, `/photos`, `/previews`, `/thumbnails`).
- **Instant QR Code & Share Page**: Dynamic QR code generation pointing to `/share/{qrToken}` with scan tracking, download count increment, and direct photo download.

### 🛡️ Admin Management Portal (`/admin`)
- **JWT Cookie Auth**: Secure HTTP-only cookies with bcrypt password hashing.
- **Analytics Dashboard**: Statistics cards (Total sessions, Today's sessions, Active frames, Total downloads, QR scans, Storage growth) and responsive SVG charts.
- **Frame Management**: Upload transparent PNG frames, set resolution and slot coordinates `[{ x, y, width, height, rotation }]`, toggle visibility, replace PNG files, and reorder.
- **Session Management**: Search sessions by token/IP, date filtering, pagination, view details, expire link immediately, download raw/final files, or bulk delete.
- **Branding Customization**: Update App Name, logo URL, CSS color tokens, footer copy, and copyright text.
- **System Settings**: Configure default countdown, JPEG/PNG quality, session TTL expiration, and watermark overlay toggles.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React icons, Framer Motion
- **Backend**: Next.js Route Handlers (`app/api/`)
- **Database**: MongoDB Atlas / Mongoose ODM
- **Storage**: Cloudflare R2 (AWS S3-compatible SDK `@aws-sdk/client-s3`)
- **Authentication**: JWT Auth in HTTP-Only Cookies + bcrypt password hashing

---

## 🚀 Quick Start Guide

### 1. Environment Setup
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Seed Database
Run the seed script to create the first administrator account and default designer frames:
```bash
npx tsx scripts/seed-admin.ts
```

**Default Admin Credentials:**
- **Email**: `admin@photobooth.com`
- **Password**: `admin123456`

### 4. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Storage Folder Structure in Cloudflare R2
```
/frames        <- Transparent PNG frame overlays
/photos        <- Captured raw user photos
/previews      <- Final rendered collage collages
/thumbnails    <- Frame thumbnail previews
/logos         <- Brand logo uploads
```
