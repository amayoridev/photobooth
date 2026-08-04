import mongoose from 'mongoose';
import path from 'path';

export function findMemoryFrameIndex(memFrames: any[], id: string): number {
  if (!id || !Array.isArray(memFrames)) return -1;
  const rawDecoded = decodeURIComponent(id);
  let cleanTarget = rawDecoded;

  // Unwrap proxy URLs: /api/proxy-image?url=https%3A%2F%2F...
  if (cleanTarget.includes('url=')) {
    try {
      cleanTarget = decodeURIComponent(cleanTarget.split('url=')[1]);
    } catch {}
  }

  const baseName = path.basename(cleanTarget).toLowerCase();
  const searchTerms = Array.from(
    new Set([rawDecoded.toLowerCase(), cleanTarget.toLowerCase(), baseName])
  ).filter(Boolean);

  return memFrames.findIndex((f) => {
    if (!f) return false;
    const fId = String(f._id || '').toLowerCase();
    const fName = String(f.name || '').toLowerCase();
    const fUrl = String(f.frameUrl || '').toLowerCase();
    const fThumb = String(f.thumbnailUrl || '').toLowerCase();
    const fR2 = String(f.r2Key || '').toLowerCase();

    return searchTerms.some(
      (term) =>
        fId === term ||
        fName === term ||
        (fUrl && fUrl.includes(term)) ||
        (fThumb && fThumb.includes(term)) ||
        (fR2 && fR2.includes(term))
    );
  });
}

export async function findFrameInMongo(FrameModel: any, id: string): Promise<any> {
  if (!id) return null;
  const rawDecoded = decodeURIComponent(id);
  let cleanTarget = rawDecoded;

  // Unwrap proxy URLs: /api/proxy-image?url=https%3A%2F%2F...
  if (cleanTarget.includes('url=')) {
    try {
      cleanTarget = decodeURIComponent(cleanTarget.split('url=')[1]);
    } catch {}
  }

  const baseName = path.basename(cleanTarget);
  const searchTerms = Array.from(new Set([rawDecoded, cleanTarget, baseName])).filter(Boolean);

  try {
    // 1. Try finding by ObjectId instance if valid
    for (const term of searchTerms) {
      if (mongoose.Types.ObjectId.isValid(term)) {
        const objId = new mongoose.Types.ObjectId(term);
        const byId = await FrameModel.findById(objId);
        if (byId) return byId;

        const byDocId = await FrameModel.findOne({ _id: objId });
        if (byDocId) return byDocId;
      }
    }

    // 2. Try string _id match
    for (const term of searchTerms) {
      const byIdStr = await FrameModel.findOne({ _id: term });
      if (byIdStr) return byIdStr;
    }

    // 3. Try finding by name
    for (const term of searchTerms) {
      const byName = await FrameModel.findOne({ name: term });
      if (byName) return byName;
    }

    // 4. Try finding by frameUrl, thumbnailUrl, or r2Key regex
    const regexOr = searchTerms.flatMap((term) => [
      { frameUrl: { $regex: term, $options: 'i' } },
      { thumbnailUrl: { $regex: term, $options: 'i' } },
      { r2Key: { $regex: term, $options: 'i' } },
    ]);

    const byUrl = await FrameModel.findOne({ $or: regexOr });
    if (byUrl) return byUrl;
  } catch (err) {
    console.warn(`Mongo findFrameInMongo failed for ${id}:`, err);
  }

  return null;
}
