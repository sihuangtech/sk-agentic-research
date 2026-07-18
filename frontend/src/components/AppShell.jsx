import {
  BookOpen,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ScrollText,
  Settings,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const links = [
  ['/', '科研总览', LayoutDashboard],
  ['/ideas', '研究假设', FlaskConical],
  ['/papers', '研究报告', FileText],
  ['/logs', '运行日志', ScrollText],
  ['/settings', '系统设置', Settings],
];

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100 selection:bg-cyan-300/30">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-[#0c111c]/95 p-6 backdrop-blur lg:block">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="rounded-xl bg-cyan-300 p-2 text-slate-950"><BookOpen size={22} /></div>
          <div>
            <p className="text-lg font-black tracking-tight">Papermill</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Research OS</p>
          </div>
        </div>
        <nav className="space-y-2">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive ? 'bg-cyan-300 text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-slate-500">
          本地执行生成代码仍有风险。正式实验建议放入独立容器。
        </div>
      </aside>
      <div className="border-b border-white/10 bg-[#0c111c] px-4 py-3 lg:hidden">
        <div className="flex gap-2 overflow-x-auto">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className="whitespace-nowrap rounded-lg bg-white/5 px-3 py-2 text-xs">
              {label}
            </NavLink>
          ))}
        </div>
      </div>
      <main className="min-h-screen p-5 md:p-10 lg:ml-64 lg:p-12">{children}</main>
    </div>
  );
}
