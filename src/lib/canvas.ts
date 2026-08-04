import { LayoutMode, LayoutSlot } from '@/types';

export interface ComposeOptions {
  frameUrl: string;
  photos: string[]; // Base64 or Blob URLs
  layoutMode: LayoutMode;
  slots?: LayoutSlot[];
  targetWidth?: number;
  targetHeight?: number;
  showWatermark?: boolean;
  watermarkText?: string;
  watermarkSize?: number; // Custom font size in px (e.g. 16 - 72px)
  watermarkPosition?: 'bottom_right' | 'bottom_center' | 'bottom_left' | 'top_right' | 'top_left';
  watermarkColor?: string;
  showLogo?: boolean;
  logoUrl?: string;
  showTimestamp?: boolean;
  outputFormat?: 'image/jpeg' | 'image/png';
  quality?: number;
}

/**
 * Automatically detects transparent cutout rectangles inside ANY frame PNG image.
 * Uses 2D Flood Fill / BFS on alpha channel to find 1-photo, 2-photo, 3-photo, or 4-photo windows.
 */
export function detectTransparentCutouts(
  frameImg: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
): LayoutSlot[] {
  try {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = frameImg.naturalWidth || canvasWidth;
    tempCanvas.height = frameImg.naturalHeight || canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) return [];

    tempCtx.drawImage(frameImg, 0, 0, tempCanvas.width, tempCanvas.height);
    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const { data, width: w, height: h } = imgData;

    const scaleX = canvasWidth / tempCanvas.width;
    const scaleY = canvasHeight / tempCanvas.height;

    // Grid sampling: 120 cols x 180 rows
    const gridCols = 120;
    const gridRows = 180;
    const cellW = w / gridCols;
    const cellH = h / gridRows;

    const isTransparentCell: boolean[][] = Array.from({ length: gridRows }, () =>
      Array(gridCols).fill(false)
    );

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const sampleX = Math.floor((c + 0.5) * cellW);
        const sampleY = Math.floor((r + 0.5) * cellH);
        const pixelIdx = (sampleY * w + sampleX) * 4;
        const alpha = data[pixelIdx + 3];

        if (alpha < 50) {
          isTransparentCell[r][c] = true;
        }
      }
    }

    // 2D Flood Fill / BFS to group connected transparent regions into bounding boxes
    const visited: boolean[][] = Array.from({ length: gridRows }, () =>
      Array(gridCols).fill(false)
    );

    const rawCutouts: { minR: number; maxR: number; minC: number; maxC: number }[] = [];

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (isTransparentCell[r][c] && !visited[r][c]) {
          let minR = r, maxR = r, minC = c, maxC = c;
          const queue: [number, number][] = [[r, c]];
          visited[r][c] = true;

          while (queue.length > 0) {
            const [currR, currC] = queue.pop()!;
            if (currR < minR) minR = currR;
            if (currR > maxR) maxR = currR;
            if (currC < minC) minC = currC;
            if (currC > maxC) maxC = currC;

            const neighbors: [number, number][] = [
              [currR - 1, currC],
              [currR + 1, currC],
              [currR, currC - 1],
              [currR, currC + 1],
            ];

            for (const [nr, nc] of neighbors) {
              if (
                nr >= 0 &&
                nr < gridRows &&
                nc >= 0 &&
                nc < gridCols &&
                isTransparentCell[nr][nc] &&
                !visited[nr][nc]
              ) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
              }
            }
          }

          // Filter out tiny noise (must span at least 15% width and 5% height)
          const boxW = (maxC - minC + 1) * cellW;
          const boxH = (maxR - minR + 1) * cellH;
          if (boxW >= w * 0.15 && boxH >= h * 0.05) {
            rawCutouts.push({ minR, maxR, minC, maxC });
          }
        }
      }
    }

    // Sort cutouts top-to-bottom, left-to-right
    rawCutouts.sort((a, b) => {
      const rowDiff = a.minR - b.minR;
      if (Math.abs(rowDiff) > 10) return rowDiff;
      return a.minC - b.minC;
    });

    if (rawCutouts.length > 0) {
      return rawCutouts.map((box) => {
        const slotX = Math.round(box.minC * cellW * scaleX);
        const slotY = Math.round(box.minR * cellH * scaleY);
        const slotW = Math.round((box.maxC - box.minC + 1) * cellW * scaleX);
        const slotH = Math.round((box.maxR - box.minR + 1) * cellH * scaleY);
        return { x: slotX, y: slotY, width: slotW, height: slotH };
      });
    }
  } catch (err) {
    console.warn('Auto cutout detection error:', err);
  }

  return [];
}

/**
 * Loads an HTMLImageElement from a URL or Base64 string.
 */
export async function loadImage(src: string): Promise<HTMLImageElement> {
  if (!src) {
    throw new Error('Image URL is empty.');
  }

  // Base64 data URLs can be loaded directly
  if (src.startsWith('data:')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  // Resolve target URL
  let targetUrl = src;
  if (src.includes('/uploads/frames/')) {
    const filename = src.split('/uploads/frames/').pop()?.split('?')[0];
    const relativePath = `/api/uploads/frames/${filename}`;
    targetUrl = typeof window !== 'undefined' ? `${window.location.origin}${relativePath}` : relativePath;
  } else if (src.includes('/uploads/')) {
    const relativePath = '/uploads/' + src.split('/uploads/').pop();
    targetUrl = typeof window !== 'undefined' ? `${window.location.origin}${relativePath}` : relativePath;
  } else if (typeof window !== 'undefined' && src.startsWith('http')) {
    try {
      const parsedUrl = new URL(src);
      if (parsedUrl.origin !== window.location.origin) {
        // Different origin/subdomain (e.g. r2.ndqm.eu.org vs ndqm.eu.org) -> route through proxy image endpoint
        targetUrl = `/api/proxy-image?url=${encodeURIComponent(src)}`;
      }
    } catch {
      targetUrl = `/api/proxy-image?url=${encodeURIComponent(src)}`;
    }
  } else if (typeof window !== 'undefined' && src.startsWith('/')) {
    targetUrl = `${window.location.origin}${src}`;
  }

  // Fetch image as a Blob to create a local Blob Object URL, guaranteeing untainted Canvas
  try {
    let res = await fetch(targetUrl);

    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = objectUrl;
      });
    }
  } catch (err) {
    console.warn(`Fetch blob failed for ${targetUrl}, trying direct Image element fallback:`, err);
  }

  // Multi-layered fallback: Try loading via standard HTMLImageElement
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (typeof window !== 'undefined' && targetUrl.startsWith('http')) {
      try {
        if (new URL(targetUrl).origin !== window.location.origin) {
          img.crossOrigin = 'anonymous';
        }
      } catch {}
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin if CORS rejected
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (fallbackErr) => {
        console.warn(`Failed to load image at URL: ${targetUrl}`, fallbackErr);
        reject(fallbackErr);
      };
      fallbackImg.src = targetUrl;
    };
    img.src = targetUrl;
  });
}

/**
 * Helper to analyze a frame PNG URL and return its detected slots and required photo count.
 */
export async function analyzeFrame(frameUrl: string): Promise<{
  slots: LayoutSlot[];
  photoCount: number;
  width: number;
  height: number;
  suggestedLayout: LayoutMode;
}> {
  try {
    const img = await loadImage(frameUrl);
    const w = img.naturalWidth || 1200;
    const h = img.naturalHeight || 1800;
    const detected = detectTransparentCutouts(img, w, h);
    const count = detected.length;

    let suggestedLayout: LayoutMode = 'single';
    if (count === 1) {
      suggestedLayout = 'single';
    } else if (count === 2) {
      suggestedLayout = 'two_photo';
    } else if (count === 3) {
      suggestedLayout = 'three_photo';
    } else if (count >= 4) {
      if (h > w * 2.2) {
        suggestedLayout = 'vertical_strip';
      } else {
        suggestedLayout = 'four_grid';
      }
    } else {
      if (h > w * 2.8) suggestedLayout = 'vertical_strip';
      else if (h > w * 2.2) suggestedLayout = 'three_photo';
      else if (h > w * 1.6) suggestedLayout = 'two_photo';
      else suggestedLayout = 'single';
    }

    return {
      slots: detected,
      photoCount: count > 0 ? count : 4,
      width: w,
      height: h,
      suggestedLayout,
    };
  } catch {
    return { slots: [], photoCount: 4, width: 1200, height: 1800, suggestedLayout: 'single' };
  }
}

/**
 * Helper to compute default layout slots if custom slot coordinates are not explicitly passed.
 */
export function getDefaultSlotsForLayout(
  layoutMode: LayoutMode,
  canvasWidth: number,
  canvasHeight: number,
  overrideCount?: number
): LayoutSlot[] {
  const padding = Math.round(canvasWidth * 0.05);

  switch (layoutMode) {
    case 'single':
      return [
        {
          x: padding,
          y: padding,
          width: canvasWidth - padding * 2,
          height: canvasHeight - padding * 2 - Math.round(canvasHeight * 0.05),
        },
      ];

    case 'two_photo': {
      const slotHeight = Math.round((canvasHeight - padding * 3) / 2);
      const slotWidth = canvasWidth - padding * 2;
      return [
        { x: padding, y: padding, width: slotWidth, height: slotHeight },
        { x: padding, y: padding * 2 + slotHeight, width: slotWidth, height: slotHeight },
      ];
    }

    case 'three_photo': {
      const count = 3;
      const gap = Math.round(canvasHeight * 0.02);
      const topOffset = Math.round(canvasHeight * 0.04);
      const availableH = canvasHeight - topOffset * 2 - gap * (count - 1);
      const stripH = Math.round(availableH / count);
      const stripW = canvasWidth - padding * 2;

      return Array.from({ length: count }).map((_, i) => ({
        x: padding,
        y: topOffset + i * (stripH + gap),
        width: stripW,
        height: stripH,
      }));
    }

    case 'four_grid': {
      const gridW = Math.round((canvasWidth - padding * 3) / 2);
      const gridH = Math.round((canvasHeight - padding * 3) / 2);
      return [
        { x: padding, y: padding, width: gridW, height: gridH },
        { x: padding + gridW + padding, y: padding, width: gridW, height: gridH },
        { x: padding, y: padding + gridH + padding, width: gridW, height: gridH },
        { x: padding + gridW + padding, y: padding + gridH + padding, width: gridW, height: gridH },
      ];
    }

    case 'film_strip':
    case 'vertical_strip': {
      const count = overrideCount || 4;
      const gap = Math.round(canvasHeight * 0.02);
      const topOffset = Math.round(canvasHeight * 0.04);
      const availableH = canvasHeight - topOffset * 2 - gap * (count - 1);
      const stripH = Math.round(availableH / count);
      const stripW = canvasWidth - padding * 2;

      return Array.from({ length: count }).map((_, i) => ({
        x: padding,
        y: topOffset + i * (stripH + gap),
        width: stripW,
        height: stripH,
      }));
    }

    case 'polaroid':
      return [
        {
          x: padding,
          y: padding,
          width: canvasWidth - padding * 2,
          height: Math.round(canvasHeight * 0.72),
        },
      ];

    case 'horizontal_strip': {
      const count = 3;
      const gap = Math.round(padding * 0.5);
      const availableW = canvasWidth - padding * 2 - gap * (count - 1);
      const stripW = Math.round(availableW / count);
      const stripH = canvasHeight - padding * 2;
      return Array.from({ length: count }).map((_, i) => ({
        x: padding + i * (stripW + gap),
        y: padding,
        width: stripW,
        height: stripH,
      }));
    }

    default:
      return [
        {
          x: padding,
          y: padding,
          width: canvasWidth - padding * 2,
          height: canvasHeight - padding * 2,
        },
      ];
  }
}

/**
 * Draws an image into a rectangular slot while maintaining cover object-fit crop and optional rotation.
 */
function drawImageInSlot(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slot: LayoutSlot
) {
  const { x, y, width, height, rotation = 0 } = slot;

  ctx.save();

  if (rotation !== 0) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  // Cover calculations
  const imgAspect = img.width / img.height;
  const slotAspect = width / height;
  let renderWidth = width;
  let renderHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (imgAspect > slotAspect) {
    renderWidth = height * imgAspect;
    offsetX = (width - renderWidth) / 2;
  } else {
    renderHeight = width / imgAspect;
    offsetY = (height - renderHeight) / 2;
  }

  // Clip to slot rectangle
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  ctx.drawImage(img, x + offsetX, y + offsetY, renderWidth, renderHeight);
  ctx.restore();
}

/**
 * Composes a full resolution PhotoBooth image with frame, slots, timestamp, logo, and watermark.
 */
export async function composePhotoBoothImage(options: ComposeOptions): Promise<string> {
  const {
    frameUrl,
    photos,
    layoutMode,
    slots: customSlots,
    targetWidth: initialWidth = 1200,
    targetHeight: initialHeight = 1800,
    showWatermark = true,
    watermarkText = 'Antigravity PhotoBooth',
    watermarkSize,
    watermarkPosition = 'bottom_right',
    watermarkColor = 'rgba(255, 255, 255, 0.85)',
    showLogo = false,
    logoUrl,
    showTimestamp = true,
    outputFormat = 'image/jpeg',
    quality = 0.92,
  } = options;

  if (typeof window === 'undefined') {
    throw new Error('Canvas composition must be executed in a browser context.');
  }

  // Load transparent frame image overlay first to adapt dimensions & detect cutouts
  let frameImg: HTMLImageElement | null = null;
  let canvasWidth = initialWidth;
  let canvasHeight = initialHeight;

  if (frameUrl) {
    try {
      frameImg = await loadImage(frameUrl);
      if (frameImg.naturalWidth && frameImg.naturalHeight) {
        // Adapt canvas size to match frame's natural dimensions or aspect ratio
        canvasWidth = frameImg.naturalWidth;
        canvasHeight = frameImg.naturalHeight;
      }
    } catch (e) {
      console.warn('Failed to load frame image overlay:', e);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create 2D canvas context.');
  }

  // 1. Fill background white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Resolve layout slots (Custom -> Auto-detected cutouts -> Default layout)
  let slots: LayoutSlot[] = [];

  if (customSlots && customSlots.length > 0) {
    slots = customSlots;
  } else if (frameImg) {
    // Try automatic transparent cutout detection from frame PNG
    slots = detectTransparentCutouts(frameImg, canvasWidth, canvasHeight);
  }

  if (!slots || slots.length === 0) {
    slots = getDefaultSlotsForLayout(layoutMode, canvasWidth, canvasHeight, photos.length);
  }

  // 3. Load user photos and render into slots UNDERNEATH the frame PNG
  const loadedPhotos = await Promise.all(
    photos.map((photoSrc) => loadImage(photoSrc).catch(() => null))
  );

  slots.forEach((slot, index) => {
    const photoImg = loadedPhotos[index % loadedPhotos.length];
    if (photoImg) {
      drawImageInSlot(ctx, photoImg, slot);
    }
  });

  // 4. Draw transparent frame PNG overlay ON TOP of user photos
  if (frameImg) {
    ctx.drawImage(frameImg, 0, 0, canvasWidth, canvasHeight);
  }

  // 5. Draw optional logo
  if (showLogo && logoUrl) {
    try {
      const logoImg = await loadImage(logoUrl);
      const logoW = Math.round(canvasWidth * 0.15);
      const logoH = Math.round((logoW / logoImg.width) * logoImg.height);
      ctx.drawImage(logoImg, canvasWidth - logoW - 20, canvasHeight - logoH - 20, logoW, logoH);
    } catch (e) {
      console.warn('Failed to load logo overlay:', e);
    }
  }

  // 6. Draw optional timestamp
  if (showTimestamp) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    ctx.save();
    ctx.font = `500 ${Math.round(canvasWidth * 0.022)}px sans-serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(dateStr, Math.round(canvasWidth * 0.04), canvasHeight - Math.round(canvasHeight * 0.02));
    ctx.restore();
  }

  // 7. Draw optional customizable watermark
  if (showWatermark && watermarkText) {
    ctx.save();
    const baseFontSize = watermarkSize || Math.round(canvasWidth * 0.025);
    ctx.font = `600 ${baseFontSize}px 'Outfit', sans-serif, system-ui`;
    ctx.fillStyle = watermarkColor || 'rgba(255, 255, 255, 0.85)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = Math.round(baseFontSize * 0.25);
    
    let x = canvasWidth - Math.round(canvasWidth * 0.04);
    let y = canvasHeight - Math.round(canvasHeight * 0.02);

    if (watermarkPosition === 'bottom_center') {
      ctx.textAlign = 'center';
      x = Math.round(canvasWidth / 2);
    } else if (watermarkPosition === 'bottom_left') {
      ctx.textAlign = 'left';
      x = Math.round(canvasWidth * 0.04);
    } else if (watermarkPosition === 'top_right') {
      ctx.textAlign = 'right';
      x = canvasWidth - Math.round(canvasWidth * 0.04);
      y = Math.round(canvasHeight * 0.04) + baseFontSize;
    } else if (watermarkPosition === 'top_left') {
      ctx.textAlign = 'left';
      x = Math.round(canvasWidth * 0.04);
      y = Math.round(canvasHeight * 0.04) + baseFontSize;
    } else {
      ctx.textAlign = 'right';
    }

    ctx.fillText(watermarkText, x, y);
    ctx.restore();
  }

  return canvas.toDataURL(outputFormat, quality);
}
