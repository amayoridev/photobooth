import mongoose from 'mongoose';

export function findMemoryFrameIndex(memFrames: any[], id: string): number {
  if (!id || !Array.isArray(memFrames)) return -1;
  const decoded = decodeURIComponent(id).toLowerCase();

  return memFrames.findIndex((f) => {
    if (!f) return false;
    const fId = String(f._id || '').toLowerCase();
    const fName = String(f.name || '').toLowerCase();
    const fUrl = String(f.frameUrl || '').toLowerCase();
    const fThumb = String(f.thumbnailUrl || '').toLowerCase();
    const fR2 = String(f.r2Key || '').toLowerCase();

    return (
      fId === decoded ||
      fName === decoded ||
      (fUrl && fUrl.includes(decoded)) ||
      (fThumb && fThumb.includes(decoded)) ||
      (fR2 && fR2.includes(decoded))
    );
  });
}

export async function findFrameInMongo(FrameModel: any, id: string): Promise<any> {
  if (!id) return null;
  const decoded = decodeURIComponent(id);

  try {
    // 1. Try finding by MongoDB _id (ObjectId or string)
    if (mongoose.Types.ObjectId.isValid(decoded)) {
      const byId = await FrameModel.findById(decoded);
      if (byId) return byId;
    }

    const byIdStr = await FrameModel.findOne({ _id: decoded });
    if (byIdStr) return byIdStr;

    // 2. Try finding by name
    const byName = await FrameModel.findOne({ name: decoded });
    if (byName) return byName;

    // 3. Try finding by frameUrl or r2Key containing the ID substring
    const byUrl = await FrameModel.findOne({
      $or: [
        { frameUrl: { $regex: decoded, $options: 'i' } },
        { thumbnailUrl: { $regex: decoded, $options: 'i' } },
        { r2Key: { $regex: decoded, $options: 'i' } },
      ],
    });
    if (byUrl) return byUrl;
  } catch (err) {
    console.warn(`Mongo findFrameInMongo failed for ${id}:`, err);
  }

  return null;
}
