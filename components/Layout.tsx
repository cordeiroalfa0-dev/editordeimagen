
import React, { useState } from 'react';
import { ProcessingResult } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  projects: ProcessingResult[];
  activeProjectId?: string;
  onSelectProject: (project: ProcessingResult) => void;
  onDeleteProject: (id: string) => void;
  onClearHistory: () => void;
  onExportLibrary: () => void;
  onGeneratePython: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  projects, 
  activeProjectId, 
  onSelectProject, 
  onDeleteProject,
  onClearHistory,
  onGeneratePython
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="mb-12 px-2 flex items-center gap-4">
        <div className="w-11 h-11 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 transform -rotate-6">
          <span className="font-black text-xl italic">V</span>
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight text-white uppercase italic leading-none">VisionEdit</h2>
          <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-1.5">Studio Master Pro</p>
        </div>
      </div>
      
      {/* Search/Library Label */}
      <div className="flex items-center justify-between px-2 mb-6">
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Ativos Recentes</span>
        <button onClick={onClearHistory} className="text-[8px] font-bold text-zinc-700 hover:text-red-400 transition-colors uppercase">Limpar</button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {projects.length === 0 ? (
          <div className="py-12 px-4 text-center border border-white/5 rounded-[2rem] bg-white/[0.01]">
            <p className="text-[9px] font-black text-zinc-800 uppercase tracking-widest">Nenhum projeto</p>
          </div>
        ) : (
          projects.map((p) => (
            <div 
              key={p.id} 
              onClick={() => { onSelectProject(p); setIsMobileMenuOpen(false); }}
              className={`group relative p-3 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center gap-4 ${activeProjectId === p.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/5'}`}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-white/5">
                <img src={p.versions[0]?.imageUrl || p.originalAlignedUrl} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-zinc-300 truncate uppercase tracking-tight">{p.id}</p>
                <p className="text-[8px] font-bold text-zinc-600 uppercase mt-0.5">{new Date(p.timestamp).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                className="opacity-0 group-hover:opacity-100 p-2 text-zinc-700 hover:text-red-500 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom Actions */}
      <div className="mt-8 pt-8 border-t border-white/5 space-y-3">
        <button 
          onClick={onGeneratePython}
          className="w-full py-3.5 bg-zinc-900 text-zinc-400 hover:text-white border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          Export Bridge (.py)
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#020202] text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-white/5 p-8 glass-panel z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-500 ${isMobileMenuOpen ? 'visible bg-black/80 backdrop-blur-sm' : 'invisible bg-transparent opacity-0 pointer-events-none'}`}>
        <aside className={`absolute left-0 top-0 bottom-0 w-72 bg-[#050505] p-6 border-r border-white/10 transition-transform duration-500 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent />
        </aside>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Nav Bar */}
        <header className="h-20 lg:h-24 px-6 lg:px-12 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-xl z-10 shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-3 bg-white/5 rounded-2xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="hidden lg:flex items-center gap-3">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500">System Live</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-10 w-[1px] bg-white/5 mx-2 hidden md:block"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <span className="text-[10px] font-black text-indigo-400">EP</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 hidden md:block">Studio Admin</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.02)_0%,_transparent_50%)]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
