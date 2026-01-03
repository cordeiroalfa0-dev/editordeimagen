
import React, { useState, useEffect } from 'react';
import { ProcessingResult, Folder } from '../types';
import { getStorageUsage } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  projects: ProcessingResult[];
  folders: Folder[];
  activeProjectId?: string;
  activeFolderId?: string;
  operatorEmail: string;
  onSelectProject: (project: ProcessingResult) => void;
  onDeleteProject: (id: string) => void;
  onClearHistory: () => void;
  onGeneratePython: () => void;
  onCreateFolder: (name: string) => void;
  onSelectFolder: (id: string | undefined) => void;
  onDeleteFolder: (id: string) => void;
  onMoveProject: (projectId: string, folderId?: string) => void;
  onInstallApp?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  projects, 
  folders,
  activeProjectId, 
  activeFolderId,
  operatorEmail,
  onSelectProject, 
  onDeleteProject,
  onClearHistory,
  onCreateFolder,
  onSelectFolder,
  onDeleteFolder,
  onInstallApp
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [storageSize, setStorageSize] = useState('0.00 MB');

  useEffect(() => {
    getStorageUsage().then(setStorageSize);
  }, [projects]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a0a0b]/98 backdrop-blur-3xl border-r border-white/10 pb-safe">
      <div className="p-8 md:p-12 shrink-0 flex items-center border-b border-white/10">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-10 h-10 md:w-16 md:h-16 bg-white text-black rounded-xl md:rounded-3xl flex items-center justify-center shadow-2xl">
            <svg className="w-6 h-6 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.691.387a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l-1.162 1.162a2 2 0 00.517 3.328 11.035 11.035 0 0011.666 0 2 2 0 00.517-3.328l-1.162-1.162z" /></svg>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none">VisionOS</h2>
            <p className="text-[8px] md:text-xs font-black text-[#e11d48] uppercase tracking-[0.3em] mt-1">ESTÚDIO MASTER</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 md:py-12 space-y-12 custom-scrollbar">
        {onInstallApp && (
          <button 
            onClick={() => { onInstallApp(); setIsSidebarOpen(false); }}
            className="w-full bg-[#e11d48] text-white py-4 md:py-6 rounded-xl md:rounded-3xl text-[10px] md:text-sm font-black uppercase tracking-widest shadow-xl"
          >
            INSTALAR APP
          </button>
        )}

        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <span className="label-wine text-[10px]">DIRETÓRIOS</span>
            <button onClick={() => { const n=prompt("NOME DA NOVA PASTA:"); if(n) onCreateFolder(n); }} className="text-[#e11d48] text-2xl">+</button>
          </div>
          <div className="space-y-2">
            <div onClick={() => { onSelectFolder(undefined); setIsSidebarOpen(false); }} className={`px-4 md:px-8 py-3 md:py-5 rounded-xl transition-all cursor-pointer ${!activeFolderId ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-white'}`}>
              <span className="text-xs md:text-base font-black uppercase tracking-widest">RAIZ</span>
            </div>
            {folders.map(f => (
              <div key={f.id} onClick={() => { onSelectFolder(f.id); setIsSidebarOpen(false); }} className={`px-4 md:px-8 py-3 md:py-5 rounded-xl transition-all cursor-pointer flex justify-between items-center group ${activeFolderId === f.id ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-white'}`}>
                <span className="text-xs md:text-base font-black uppercase tracking-widest truncate">{f.name}</span>
                <button onClick={(e) => { e.stopPropagation(); if(confirm("DELETAR?")) onDeleteFolder(f.id); }} className="text-[#e11d48] text-xs px-2">✕</button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <span className="label-wine text-[10px] block mb-6 px-2">RECENTES</span>
          <div className="grid grid-cols-2 gap-3 md:gap-5">
            {projects.slice(0, 8).map(p => (
              <div key={p.id} onClick={() => { onSelectProject(p); setIsSidebarOpen(false); }} className={`aspect-square rounded-xl md:rounded-3xl overflow-hidden border border-white/5 cursor-pointer ${activeProjectId === p.id ? 'ring-2 ring-[#e11d48]' : 'opacity-40 hover:opacity-100'}`}>
                <img src={p.versions[0]?.imageUrl} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-8 border-t border-white/5 bg-black/40">
        <p className="text-[8px] md:text-xs font-black text-zinc-600 uppercase mb-4 text-center tracking-[0.2em]">{storageSize} USADO</p>
        <button onClick={onClearHistory} className="w-full py-4 text-[9px] md:text-sm font-black uppercase tracking-widest text-zinc-500 hover:text-white border border-white/10 rounded-xl">LIMPAR</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#0a0a0b] text-white overflow-hidden">
      <aside className="hidden lg:flex flex-col w-[360px] z-20"><SidebarContent /></aside>
      
      {/* SIDEBAR MOBILE */}
      <div className={`fixed inset-0 z-[600] lg:hidden transition-all duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsSidebarOpen(false)}></div>
        <aside className={`absolute top-0 left-0 bottom-0 w-[80%] transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <SidebarContent />
        </aside>
      </div>

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="h-16 md:h-24 px-6 md:px-16 flex items-center justify-between border-b border-white/10 bg-[#0a0a0b]/80 backdrop-blur-xl z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 text-white bg-white/5 rounded-xl border border-white/10">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          
          <div className="hidden md:flex items-center gap-8">
             <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#e11d48] rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">SISTEMA_ATIVO</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="w-10 h-10 md:w-12 md:h-12 bg-white text-black rounded-xl md:rounded-2xl flex items-center justify-center font-black text-xs md:text-sm shadow-xl">V3</div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto relative custom-scrollbar pt-safe">
           {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
