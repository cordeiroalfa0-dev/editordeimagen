
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
  onGeneratePython,
  onCreateFolder,
  onSelectFolder,
  onDeleteFolder,
  onMoveProject,
  onInstallApp
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [storageSize, setStorageSize] = useState('0.00 MB');

  useEffect(() => {
    getStorageUsage().then(setStorageSize);
  }, [projects]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a0a0b]/95 backdrop-blur-3xl border-r border-white/15 pb-safe">
      <div className="p-12 shrink-0 flex items-center border-b border-white/10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white text-black rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] scale-110">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.691.387a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l-1.162 1.162a2 2 0 00.517 3.328 11.035 11.035 0 0011.666 0 2 2 0 00.517-3.328l-1.162-1.162z" /></svg>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">VisionOS</h2>
            <p className="text-xs font-black text-[#e11d48] uppercase tracking-[0.5em] mt-2 animate-wine-pulse">ESTÚDIO MASTER</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-12 space-y-16 custom-scrollbar">
        {onInstallApp && (
          <button 
            onClick={() => { onInstallApp(); setIsSidebarOpen(false); }}
            className="w-full bg-[#e11d48] text-white py-6 rounded-3xl text-sm font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(225,29,72,0.3)] hover:brightness-125 active:scale-95 transition-all"
          >
            INSTALAR SISTEMA
          </button>
        )}

        <section>
          <div className="flex items-center justify-between mb-10 px-2">
            <span className="label-wine text-xs">DIRETÓRIOS</span>
            <button onClick={() => { const n=prompt("NOME DA NOVA PASTA:"); if(n) onCreateFolder(n); }} className="text-[#e11d48] hover:text-white transition-all text-4xl font-light">+</button>
          </div>
          <div className="space-y-4">
            <div onClick={() => { onSelectFolder(undefined); setIsSidebarOpen(false); }} className={`px-8 py-5 rounded-2xl transition-all cursor-pointer ${!activeFolderId ? 'bg-white/10 text-white shadow-xl border border-white/10' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}>
              <span className="text-base font-black uppercase tracking-widest">RAIZ_REPOS</span>
            </div>
            {folders.map(f => (
              <div key={f.id} onClick={() => { onSelectFolder(f.id); setIsSidebarOpen(false); }} className={`px-8 py-5 rounded-2xl transition-all cursor-pointer flex justify-between items-center group ${activeFolderId === f.id ? 'bg-white/10 text-white shadow-xl border border-white/10' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}>
                <span className="text-base font-black uppercase tracking-widest truncate">{f.name}</span>
                <button onClick={(e) => { e.stopPropagation(); if(confirm("DELETAR ESTA PASTA?")) onDeleteFolder(f.id); }} className="opacity-0 group-hover:opacity-100 text-[#e11d48] font-black text-xl px-2">✕</button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <span className="label-wine text-xs block mb-10 px-2">ULTIMOS RENDERS</span>
          <div className="grid grid-cols-2 gap-5">
            {projects.slice(0, 10).map(p => (
              <div key={p.id} onClick={() => { onSelectProject(p); setIsSidebarOpen(false); }} className={`aspect-square rounded-3xl overflow-hidden border-2 border-white/5 cursor-pointer transition-all hover:border-[#e11d48]/50 ${activeProjectId === p.id ? 'ring-4 ring-[#e11d48] scale-95 shadow-2xl' : 'grayscale hover:grayscale-0 opacity-40 hover:opacity-100'}`}>
                <img src={p.versions[0]?.imageUrl || p.originalAlignedUrl} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-12 border-t border-white/10 bg-black/60 backdrop-blur-3xl">
        <p className="text-xs font-black text-zinc-500 uppercase mb-8 text-center tracking-[0.4em] drop-shadow-md">{storageSize} EM DISCO</p>
        <button onClick={onClearHistory} className="w-full py-6 text-sm font-black uppercase tracking-[0.4em] text-zinc-400 hover:text-[#e11d48] transition-all border-2 border-white/10 rounded-3xl active:bg-[#e11d48]/10">LIMPAR MEMÓRIA</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#0a0a0b] text-white overflow-hidden">
      <aside className="hidden lg:flex flex-col w-[400px] z-20"><SidebarContent /></aside>
      
      <div className={`fixed inset-0 z-[400] lg:hidden transition-all duration-700 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => setIsSidebarOpen(false)}></div>
        <aside className={`absolute top-0 left-0 bottom-0 w-[85%] max-w-[340px] transition-transform duration-700 ${isSidebarOpen ? 'translate-x-0 shadow-[0_0_100px_rgba(0,0,0,1)]' : '-translate-x-full'}`}>
           <SidebarContent />
        </aside>
      </div>

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="h-24 md:h-28 px-10 md:px-16 flex items-center justify-between border-b border-white/10 bg-[#0a0a0b]/80 backdrop-blur-2xl z-10 shadow-2xl">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-5 text-zinc-300 bg-white/5 rounded-2xl border border-white/10 shadow-2xl">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          
          <div className="hidden md:flex items-center gap-12">
             <div className="flex items-center gap-5">
                <div className="w-4 h-4 bg-[#e11d48] rounded-full animate-pulse shadow-[0_0_25px_rgba(225,29,72,0.9)]"></div>
                <span className="text-xs font-black uppercase tracking-[0.8em] text-white drop-shadow-lg">SYSTEM_SYNC: ACTIVE</span>
             </div>
             <div className="w-px h-8 bg-white/15"></div>
             <p className="text-xs font-black uppercase tracking-[0.4em] text-white/40 truncate max-w-[300px]">{operatorEmail}</p>
          </div>

          <div className="flex items-center gap-8">
             <div className="w-14 h-14 bg-white text-black rounded-3xl flex items-center justify-center font-black text-lg shadow-[0_0_30px_rgba(255,255,255,0.4)] scale-110">V3</div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto relative custom-scrollbar overflow-x-hidden pt-safe">
           {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
