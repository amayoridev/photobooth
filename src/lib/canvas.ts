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
 * Clean & High-Precision Cutout Detector for PNG Photobooth Frames.
 * Detects inner transparent photo windows while filtering out outer background margins and semi-transparent artwork.
 */
export function detectTransparentCutouts(
  frameImg: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
): LayoutSlot[] {
  try {
    const naturalW = frameImg.naturalWidth || canvasWidth || 1200;
    const naturalH = frameImg.naturalHeight || canvasHeight || 1800;

    // Standard detection grid (400px width) for fast, pixel-accurate bounding box extraction
    const detectW = 400;
    const detectH = Math.max(150, Math.round(detectW * (naturalH / naturalW)));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = detectW;
    tempCanvas.height = detectH;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    if (!tempCtx) return [];

    tempCtx.drawImage(frameImg, 0, 0, detectW, detectH);
    const imgData = tempCtx.getImageData(0, 0, detectW, detectH);
    const { data } = imgData;

    const isTransparent: boolean[][] = Array.from({ length: detectH }, () =>
      Array(detectW).fill(false)
    );

    // Strict Alpha Threshold (< 50) for true transparent photo cutout windows
    for (let r = 0; r < detectH; r++) {
      for (let c = 0; c < detectW; c++) {
        const pixelIdx = (r * detectW + c) * 4;
        const alpha = data[pixelIdx + 3];
        if (alpha < 50) {
          isTransparent[r][c] = true;
        }
      }
    }

    const visited: boolean[][] = Array.from({ length: detectH }, () =>
      Array(detectW).fill(false)
    );

    // Pass 1: Flood fill outer transparent margins starting from outer boundaries
    const outerQueue: [number, number][] = [];

    for (let c = 0; c < detectW; c++) {
      if (isTransparent[0][c] && !visited[0][c]) {
        visited[0][c] = true;
        outerQueue.push([0, c]);
      }
      if (isTransparent[detectH - 1][c] && !visited[detectH - 1][c]) {
        visited[detectH - 1][c] = true;
        outerQueue.push([detectH - 1, c]);
      }
    }

    for (let r = 0; r < detectH; r++) {
      if (isTransparent[r][0] && !visited[r][0]) {
        visited[r][0] = true;
        outerQueue.push([r, 0]);
      }
      if (isTransparent[r][detectW - 1] && !visited[r][detectW - 1]) {
        visited[r][detectW - 1] = true;
        outerQueue.push([r, detectW - 1]);
      }
    }

    while (outerQueue.length > 0) {
      const [cr, cc] = outerQueue.pop()!;
      const neighbors: [number, number][] = [
        [cr - 1, cc],
        [cr + 1, cc],
        [cr, cc - 1],
        [cr, cc + 1],
      ];

      for (const [nr, nc] of neighbors) {
        if (
          nr >= 0 &&
          nr < detectH &&
          nc >= 0 &&
          nc < detectW &&
          isTransparent[nr][nc] &&
          !visited[nr][nc]
        ) {
          visited[nr][nc] = true;
          outerQueue.push([nr, nc]);
        }
      }
    }

    // Pass 2: Remaining unvisited transparent regions MUST be inner photo windows!
    const rawCutouts: { minR: number; maxR: number; minC: number; maxC: number }[] = [];

    for (let r = 0; r < detectH; r++) {
      for (let c = 0; c < detectW; c++) {
        if (isTransparent[r][c] && !visited[r][c]) {
          let minR = r, maxR = r, minC = c, maxC = c;
          const stack: [number, number][] = [[r, c]];
          visited[r][c] = true;

          while (stack.length > 0) {
            const [cr, cc] = stack.pop()!;

            if (cr < minR) minR = cr;
            if (cr > maxR) maxR = cr;
            if (cc < minC) minC = cc;
            if (cc > maxC) maxC = cc;

            const neighbors: [number, number][] = [
              [cr - 1, cc],
              [cr + 1, cc],
              [cr, cc - 1],
              [cr, cc + 1],
            ];

            for (const [nr, nc] of neighbors) {
              if (
                nr >= 0 &&
                nr < detectH &&
                nc >= 0 &&
                nc < detectW &&
                isTransparent[nr][nc] &&
                !visited[nr][nc]
              ) {
                visited[nr][nc] = true;
                stack.push([nr, nc]);
              }
            }
          }

          const boxW = maxC - minC + 1;
          const boxH = maxR - minR + 1;

          // Filter out noise early on grid: minimum 25% grid width and 10% grid height
          const minGridW = Math.round(detectW * 0.25);
          const minGridH = Math.round(detectH * 0.10);

          if (boxW >= minGridW && boxH >= minGridH) {
            rawCutouts.push({ minR, maxR, minC, maxC });
          }
        }
      }
    }

    // Sort cutouts top-to-bottom, left-to-right
    rawCutouts.sort((a, b) => {
      const rowDiff = a.minR - b.minR;
      if (Math.abs(rowDiff) > 15) return rowDiff;
      return a.minC - b.minC;
    });

    if (rawCutouts.length > 0) {
      const scaleX = canvasWidth / detectW;
      const scaleY = canvasHeight / detectH;

      // Strict hard limits: Minimum width 350px (300px for narrow strips), Minimum height 240px
      const minSlotW = canvasWidth < 900 ? 300 : 350;
      const minSlotH = 240;

      const validSlots: LayoutSlot[] = [];

      rawCutouts.forEach((box) => {
        const slotX = Math.round(box.minC * scaleX);
        const slotY = Math.round(box.minR * scaleY);
        const slotW = Math.round((box.maxC - box.minC + 1) * scaleX);
        const slotH = Math.round((box.maxR - box.minR + 1) * scaleY);

        // Strictly reject any small transparent holes/overlays below 350px width and 240px height
        if (slotW >= minSlotW && slotH >= minSlotH) {
          validSlots.push({ x: slotX, y: slotY, width: slotW, height: slotH });
        }
      });

      return validSlots;
    }
  } catch (err) {
    console.warn('Cutout detection error:', err);
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

  if (src.startsWith('data:')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

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
        targetUrl = `/api/proxy-image?url=${encodeURIComponent(src)}`;
      }
    } catch {
      targetUrl = `/api/proxy-image?url=${encodeURIComponent(src)}`;
    }
  } else if (typeof window !== 'undefined' && src.startsWith('/')) {
    targetUrl = `${window.location.origin}${src}`;
  }

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
    let detected = detectTransparentCutouts(img, w, h);

    const isBDers = frameUrl.toLowerCase().includes('bders');
    let suggestedLayout: LayoutMode = 'single';

    if (isBDers) {
      suggestedLayout = 'vertical_strip';
    } else if (detected.length === 1) {
      suggestedLayout = 'single';
    } else if (detected.length === 2) {
      suggestedLayout = 'two_photo';
    } else if (detected.length === 3) {
      suggestedLayout = 'three_photo';
    } else if (detected.length >= 4) {
      if (h > w * 2.2) {
        suggestedLayout = 'vertical_strip';
      } else {
        suggestedLayout = 'four_grid';
      }
    } else {
      if (h > w * 2.5) suggestedLayout = 'vertical_strip';
      else if (h > w * 1.9) suggestedLayout = 'three_photo';
      else if (h > w * 1.4) suggestedLayout = 'two_photo';
      else suggestedLayout = 'single';
    }

    // Determine target expected slot count for layout
    let targetCount = 1;
    if (suggestedLayout === 'two_photo') targetCount = 2;
    if (suggestedLayout === 'three_photo') targetCount = 3;
    if (suggestedLayout === 'vertical_strip' || suggestedLayout === 'four_grid' || isBDers) targetCount = 4;

    // If auto cutout detection found fewer slots than required, auto-fill with exact default layout slots!
    if (!detected || detected.length === 0) {
      detected = getDefaultSlotsForLayout(suggestedLayout, w, h, targetCount);
    }

    return {
      slots: detected,
      photoCount: detected.length,
      width: w,
      height: h,
      suggestedLayout,
    };
  } catch {
    return {
      slots: getDefaultSlotsForLayout('single', 1200, 1800, 4),
      photoCount: 4,
      width: 1200,
      height: 1800,
      suggestedLayout: 'single',
    };
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

    case 'horizontal_strip': {
      const count = overrideCount || 4;
      const gap = Math.round(canvasWidth * 0.02);
      const leftOffset = Math.round(canvasWidth * 0.04);
      const availableW = canvasWidth - leftOffset * 2 - gap * (count - 1);
      const stripW = Math.round(availableW / count);
      const stripH = canvasHeight - padding * 2;

      return Array.from({ length: count }).map((_, i) => ({
        x: leftOffset + i * (stripW + gap),
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
 * Main function to merge captured photos into a single photo strip or grid with frame PNG overlay and Admin Watermark.
 */
export async function composePhotoBoothImage(options: ComposeOptions): Promise<string> {
  const {
    frameUrl,
    photos,
    layoutMode,
    slots: passedSlots,
    targetWidth = 1200,
    targetHeight = 1800,
    showWatermark = true,
    watermarkText = 'Antigravity PhotoBooth',
    watermarkSize = 30,
    watermarkPosition = 'bottom_right',
    watermarkColor = '#ffffff',
    outputFormat = 'image/jpeg',
    quality = 0.92,
  } = options;

  let frameImg: HTMLImageElement | null = null;
  try {
    frameImg = await loadImage(frameUrl);
  } catch (err) {
    console.warn(`Could not load frame overlay image from ${frameUrl}, composing without overlay:`, err);
  }

  const canvasW = targetWidth || frameImg?.naturalWidth || 1200;
  const canvasH = targetHeight || frameImg?.naturalHeight || 1800;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  let slots: LayoutSlot[] = passedSlots && passedSlots.length > 0 ? passedSlots : [];

  if (slots.length === 0 && frameImg) {
    slots = detectTransparentCutouts(frameImg, canvasW, canvasH);
  }

  if (slots.length === 0) {
    slots = getDefaultSlotsForLayout(layoutMode, canvasW, canvasH, photos.length);
  }

  const loadedPhotos: (HTMLImageElement | null)[] = await Promise.all(
    photos.map((src) => loadImage(src).catch(() => null))
  );

  slots.forEach((slot, index) => {
    const photoImg = loadedPhotos[index % loadedPhotos.length];
    if (!photoImg) return;

    const imgW = photoImg.naturalWidth || 1000;
    const imgH = photoImg.naturalHeight || 1000;
    const imgRatio = imgW / imgH;

    const slotW = slot.width;
    const slotH = slot.height;
    const slotRatio = slotW / slotH;

    let sx = 0, sy = 0, sWidth = imgW, sHeight = imgH;

    if (imgRatio > slotRatio) {
      sWidth = Math.round(imgH * slotRatio);
      sx = Math.round((imgW - sWidth) / 2);
    } else {
      sHeight = Math.round(imgW / slotRatio);
      sy = Math.round((imgH - sHeight) / 2);
    }

    ctx.save();

    if (slot.rotation) {
      const centerX = slot.x + slotW / 2;
      const centerY = slot.y + slotH / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((slot.rotation * Math.PI) / 180);
      ctx.drawImage(photoImg, sx, sy, sWidth, sHeight, -slotW / 2, -slotH / 2, slotW, slotH);
    } else {
      ctx.drawImage(photoImg, sx, sy, sWidth, sHeight, slot.x, slot.y, slotW, slotH);
    }

    ctx.restore();
  });

  if (frameImg) {
    ctx.drawImage(frameImg, 0, 0, canvasW, canvasH);
  }

  if (showWatermark && watermarkText) {
    ctx.save();

    const fontSize = watermarkSize;
    ctx.font = `600 ${fontSize}px sans-serif, system-ui`;
    ctx.fillStyle = watermarkColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const textMetrics = ctx.measureText(watermarkText);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    const padding = 30;
    let wx = canvasW - textWidth - padding;
    let wy = canvasH - padding;

    if (watermarkPosition === 'bottom_center') {
      wx = (canvasW - textWidth) / 2;
      wy = canvasH - padding;
    } else if (watermarkPosition === 'bottom_left') {
      wx = padding;
      wy = canvasH - padding;
    } else if (watermarkPosition === 'top_right') {
      wx = canvasW - textWidth - padding;
      wy = padding + textHeight;
    } else if (watermarkPosition === 'top_left') {
      wx = padding;
      wy = padding + textHeight;
    }

    ctx.fillText(watermarkText, wx, wy);
    ctx.restore();
  }

  return canvas.toDataURL(outputFormat, quality);
}
