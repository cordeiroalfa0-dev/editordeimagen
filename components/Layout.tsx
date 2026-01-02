
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
    <>
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(99,102,241,0.4)]">V</div>
        <span className="text-lg font-black tracking-tighter uppercase italic text-white">VisionEdit <span className="text-indigo-500">Master</span></span>
      </div>
      
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Biblioteca</p>
          {projects.length > 0 && (
            <button onClick={onClearHistory} className="text-[8px] font-bold text-zinc-700 hover:text-red-500 transition-colors uppercase">Limpar Tudo</button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {projects.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-zinc-900 rounded-3xl">
              <p className="text-[9px] font-bold text-zinc-800 uppercase leading-relaxed">Nenhuma edição salva localmente.</p>
            </div>
          ) : (
            projects.map((p) => (
              <div 
                key={p.id} 
                className={`group relative p-2 rounded-2xl border transition-all cursor-pointer ${activeProjectId === p.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'}`}
                onClick={() => {
                  onSelectProject(p);
                  setIsMobileMenuOpen(false);
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 shrink-0 border border-zinc-800">
                    <img src={p.versions[0]?.imageUrl || p.originalAlignedUrl} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-white truncate uppercase tracking-tighter">{p.id}</p>
                    <p className="text-[8px] font-bold text-zinc-600 uppercase">{new Date(p.timestamp).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-500 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-3 pt-6 border-t border-zinc-900">
        <button 
          onClick={onGeneratePython}
          className="w-full py-4 bg-indigo-500 text-white hover:bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(99,102,241,0.3)] active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          Gerar Ultra-Res (.py)
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-zinc-950 overflow-hidden relative">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-80 border-r border-zinc-900 p-6 space-y-8 bg-zinc-950/80 backdrop-blur-xl z-20">
        <SidebarContent />
      </aside>

      {/* Sidebar - Mobile Drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        <aside className={`absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-zinc-950 p-6 flex flex-col border-r border-zinc-900 transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent />
        </aside>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-4 bg-zinc-950/50 backdrop-blur-md z-30 lg:hidden">
           <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-zinc-400 hover:text-white"
           >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
           </button>
           <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center font-black text-sm italic">V</div>
              <span className="font-black uppercase tracking-tighter italic text-white text-sm">VisionEdit</span>
           </div>
           <div className="w-10"></div> {/* Spacer for alignment */}
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
