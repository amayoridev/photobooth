'use client';

interface DailySessionData {
  date: string;
  count: number;
}

interface PopularFrameData {
  frameId: string;
  frameName: string;
  count: number;
}

interface AnalyticsChartsProps {
  dailySessions: DailySessionData[];
  popularFrames: PopularFrameData[];
}

export function AnalyticsCharts({ dailySessions = [], popularFrames = [] }: AnalyticsChartsProps) {
  const maxSessionCount = Math.max(...dailySessions.map((d) => d.count), 1);
  const maxFrameCount = Math.max(...popularFrames.map((f) => f.count), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* 1. Daily Sessions Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-white mb-1">Daily Photo Sessions</h3>
          <p className="text-xs text-slate-400 mb-6">Total completed photo booth captures over past 7 days</p>

          <div className="h-48 flex items-end justify-between gap-2 pt-4 border-b border-slate-800">
            {dailySessions.map((item, idx) => {
              const heightPercent = Math.max(Math.round((item.count / maxSessionCount) * 100), 8);
              const dayLabel = new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.count}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t-xl group-hover:brightness-125 transition-all shadow-lg shadow-indigo-500/20"
                  />
                  <span className="text-[10px] font-semibold text-slate-400 mt-1">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Most Popular Frames Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-white mb-1">Most Popular Frames</h3>
          <p className="text-xs text-slate-400 mb-6">Top frame overlays selected by users</p>

          <div className="space-y-4">
            {popularFrames.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No frame usage recorded yet.</p>
            ) : (
              popularFrames.map((frame, idx) => {
                const widthPercent = Math.max(Math.round((frame.count / maxFrameCount) * 100), 10);

                return (
                  <div key={frame.frameId || idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white truncate max-w-[200px]">
                        #{idx + 1} {frame.frameName}
                      </span>
                      <span className="font-bold text-indigo-400">{frame.count} sessions</span>
                    </div>
                    <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        style={{ width: `${widthPercent}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
