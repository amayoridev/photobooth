import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  color?: 'indigo' | 'emerald' | 'amber' | 'purple' | 'pink' | 'cyan';
}

const COLOR_MAP = {
  indigo: 'from-indigo-600/20 to-indigo-900/10 border-indigo-500/30 text-indigo-400',
  emerald: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
  amber: 'from-amber-600/20 to-amber-900/10 border-amber-500/30 text-amber-400',
  purple: 'from-purple-600/20 to-purple-900/10 border-purple-500/30 text-purple-400',
  pink: 'from-pink-600/20 to-pink-900/10 border-pink-500/30 text-pink-400',
  cyan: 'from-cyan-600/20 to-cyan-900/10 border-cyan-500/30 text-cyan-400',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'indigo',
}: StatCardProps) {
  const styleClass = COLOR_MAP[color];

  return (
    <div
      className={`relative bg-slate-900/90 border rounded-3xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between transition-transform hover:-translate-y-1 ${styleClass.split(' ')[2]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-2xl bg-slate-950 border border-slate-800 ${styleClass.split(' ')[3]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{value}</div>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>

      {trend && (
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}
