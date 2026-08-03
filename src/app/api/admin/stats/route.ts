import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { authenticateAdminRequest, unauthorizedResponse } from '@/lib/auth';
import { Session } from '@/models/Session';
import { Frame } from '@/models/Frame';
import { Photo } from '@/models/Photo';

export async function GET(req: NextRequest) {
  try {
    const payload = await authenticateAdminRequest(req);
    if (!payload) return unauthorizedResponse();

    await connectToDatabase();

    // 1. Core counters
    const totalSessions = await Session.countDocuments();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todaySessions = await Session.countDocuments({ createdAt: { $gte: startOfToday } });

    const activeFrames = await Frame.countDocuments({ enabled: true });

    // Download & scan aggregations
    const aggTotals = await Session.aggregate([
      {
        $group: {
          _id: null,
          totalDownloads: { $sum: '$downloadCount' },
          totalScans: { $sum: '$scanCount' },
        },
      },
    ]);

    const totalDownloads = aggTotals[0]?.totalDownloads || 0;
    const totalScans = aggTotals[0]?.totalScans || 0;

    // Storage estimation
    const totalPhotos = await Photo.countDocuments();
    const estimatedStorageMB = Math.round((totalSessions * 1.8 + totalPhotos * 0.8) * 10) / 10;

    // Popular frames
    const popularFramesAgg = await Session.aggregate([
      { $group: { _id: '$frameId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'frames',
          localField: '_id',
          foreignField: '_id',
          as: 'frameInfo',
        },
      },
      { $unwind: '$frameInfo' },
      {
        $project: {
          frameId: '$_id',
          frameName: '$frameInfo.name',
          count: 1,
        },
      },
    ]);

    // Daily sessions for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailySessionsAgg = await Session.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          downloads: { $sum: '$downloadCount' },
          scans: { $sum: '$scanCount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build complete date array for 7 days
    const dailySessions = [];
    const downloadsTrend = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];

      const found = dailySessionsAgg.find((item) => item._id === dateStr);
      dailySessions.push({ date: dateStr, count: found ? found.count : 0 });
      downloadsTrend.push({
        date: dateStr,
        downloads: found ? found.downloads : 0,
        scans: found ? found.scans : 0,
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalSessions,
        todaySessions,
        activeFrames,
        totalDownloads,
        totalScans,
        estimatedStorageMB,
        popularFrames: popularFramesAgg,
        dailySessions,
        downloadsTrend,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch statistics.' },
      { status: 500 }
    );
  }
}
