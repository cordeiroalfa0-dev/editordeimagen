
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
  onExportLibrary,
  onGeneratePython
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center space-x-3 mb-12 p-2">
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-black text-xl shadow-[0_10px_30px_rgba(99,102,241,0.4)] transform rotate-[-8deg]">V</div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tighter uppercase italic text-white leading-none">VisionEdit</span>
          <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Master Studio</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col space-y-8 overflow-hidden">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Biblioteca</p>
          {projects.length > 0 && (
            <button onClick={onClearHistory} className="text-[8px] font-bold text-zinc-700 hover:text-red-500 transition-all uppercase tracking-widest">Wipe All</button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
          {projects.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.02]">
              <p className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest leading-loose">Sem Projetos</p>
            </div>
          ) : (
            projects.map((p) => (
              <div 
                key={p.id} 
                className={`group relative p-3 rounded-[1.5rem] border transition-all cursor-pointer ${activeProjectId === p.id ? 'bg-indigo-500/10 border-indigo-500/20 shadow-2xl shadow-indigo-500/10' : 'bg-zinc-900/30 border-white/5 hover:border-white/10'}`}
                onClick={() => {
                  onSelectProject(p);
                  setIsMobileMenuOpen(false);
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-white/5 shadow-inner">
                    <img src={p.versions[0]?.imageUrl || p.originalAlignedUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-white truncate uppercase tracking-tight">{p.id}</p>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase mt-1">{new Date(p.timestamp).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-700 hover:text-red-500 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-8 border-t border-white/5 mt-6">
        <button 
          onClick={onGeneratePython}
          className="w-full py-4 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group"
        >
          <svg className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          Export (.py)
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-transparent overflow-hidden relative">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-80 border-r border-white/5 p-8 bg-zinc-950/40 backdrop-blur-3xl z-20">
        <SidebarContent />
      </aside>

      {/* Sidebar - Mobile */}
      <div className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-500 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)} />
        <aside className={`absolute left-0 top-0 bottom-0 w-[85%] max-w-xs bg-zinc-950 p-6 flex flex-col border-r border-white/5 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent />
        </aside>
      </div>

      {/* Content Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Navbar */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 bg-black/20 backdrop-blur-xl z-50 lg:hidden">
           <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-3 bg-zinc-900/50 rounded-xl text-zinc-300 border border-white/5"
           >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
           </button>
           <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-500/20 italic">V</div>
              <span className="font-black uppercase tracking-tighter italic text-white">Studio</span>
           </div>
           <div className="w-12"></div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
