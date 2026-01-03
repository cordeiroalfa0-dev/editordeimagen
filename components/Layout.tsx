
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
    <div className="flex flex-col h-full bg-[#0a0a0b]/60 backdrop-blur-3xl border-r border-white/5">
      <div className="p-12 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center shadow-[0_15px_35px_rgba(255,255,255,0.08)]">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.691.387a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l-1.162 1.162a2 2 0 00.517 3.328 11.035 11.035 0 0011.666 0 2 2 0 00.517-3.328l-1.162-1.162z" /></svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none">VisionOS</h2>
            <p className="text-[9px] font-bold text-[#9b1b30] uppercase tracking-[0.4em] mt-2">V3_ESTÚDIO</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-4 space-y-12 custom-scrollbar">
        {onInstallApp && (
          <section>
            <button 
              onClick={() => { onInstallApp(); setIsSidebarOpen(false); }}
              className="w-full bg-[#9b1b30] text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] shadow-[0_15px_35px_rgba(155,27,48,0.25)] hover:scale-[1.02] transition-transform"
            >
              Instalar_Nó
            </button>
          </section>
        )}

        <section className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
           <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-1">ID_Operador</p>
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-black border border-white/10">EC</div>
              <p className="text-[9px] font-bold text-zinc-400 truncate flex-1">{operatorEmail}</p>
           </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em]">Coleções</span>
            <button onClick={() => { const n=prompt("NOME_DA_COLEÇÃO:"); if(n) onCreateFolder(n); }} className="text-zinc-600 hover:text-white transition-colors text-xl">+</button>
          </div>
          <div className="space-y-2">
            <div onClick={() => { onSelectFolder(undefined); setIsSidebarOpen(false); }} className={`px-6 py-4 rounded-2xl transition-all cursor-pointer ${!activeFolderId ? 'bg-white/10 text-white border border-white/10' : 'text-zinc-600 hover:text-zinc-400'}`}>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Arquivo_Raiz</span>
            </div>
            {folders.map(f => (
              <div key={f.id} onClick={() => { onSelectFolder(f.id); setIsSidebarOpen(false); }} className={`px-6 py-4 rounded-2xl transition-all cursor-pointer flex justify-between items-center group ${activeFolderId === f.id ? 'bg-white/10 text-white border border-white/10' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] truncate pr-4">{f.name}</span>
                <button onClick={(e) => { e.stopPropagation(); if(confirm("EXCLUIR_COLEÇÃO?")) onDeleteFolder(f.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-red-500">X</button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em] block mb-8 px-2">Prévia_Rápida</span>
          <div className="grid grid-cols-2 gap-3">
            {projects.slice(0, 8).map(p => (
              <div key={p.id} onClick={() => { onSelectProject(p); setIsSidebarOpen(false); }} className={`aspect-square rounded-2xl overflow-hidden border border-white/5 cursor-pointer transition-all hover:border-[#9b1b30]/50 ${activeProjectId === p.id ? 'ring-2 ring-[#9b1b30] scale-95 shadow-[0_0_25px_rgba(155,27,48,0.3)]' : 'grayscale hover:grayscale-0'}`}>
                <img src={p.versions[0]?.imageUrl || p.originalAlignedUrl} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-12 border-t border-white/5 bg-black/40">
        <div className="flex items-center justify-between text-[9px] font-black text-zinc-700 uppercase mb-6">
          <span>{storageSize} Usado</span>
        </div>
        <button onClick={onClearHistory} className="w-full py-5 text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-red-500 transition-colors border border-white/5 rounded-2xl">Limpar_Arquivo</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#0a0a0b] text-white overflow-hidden">
      <aside className="hidden lg:flex flex-col w-96 z-20"><SidebarContent /></aside>
      
      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setIsSidebarOpen(false)}></div>
        <aside className={`absolute top-0 left-0 bottom-0 w-[320px] transition-transform duration-500 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <SidebarContent />
        </aside>
      </div>

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="h-20 px-10 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-3xl z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 text-zinc-400 bg-white/5 rounded-xl border border-white/10">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          
          <div className="hidden lg:flex items-center gap-12">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#9b1b30] rounded-full animate-pulse shadow-[0_0_15px_rgba(155,27,48,0.6)]"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600">Sistema_Online</span>
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30">{operatorEmail}</p>
          </div>

          <div className="flex items-center gap-5">
             {onInstallApp && (
               <button onClick={onInstallApp} className="px-6 py-3 bg-[#9b1b30] rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-[#9b1b30]/20">Instalar_App</button>
             )}
             <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center font-black text-[11px] shadow-lg">V3</div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto relative custom-scrollbar overflow-x-hidden">
           {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
