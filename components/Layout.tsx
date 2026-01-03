
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
  onMoveProject
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [storageSize, setStorageSize] = useState('0.00 MB');

  useEffect(() => {
    getStorageUsage().then(setStorageSize);
  }, [projects]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#030303]">
      <div className="p-10 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.691.387a6 6 0 01-3.86.517l-2.387-.477a2 2 0 00-1.022.547l-1.162 1.162a2 2 0 00.517 3.328 11.035 11.035 0 0011.666 0 2 2 0 00.517-3.328l-1.162-1.162z" /></svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none">VisionOS</h2>
            <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.4em] mt-1">OPERATOR SESSION</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
        <section className="bg-indigo-600/5 border border-indigo-500/10 rounded-[2rem] p-6 space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black">EC</div>
             <div className="flex-1 min-w-0">
               <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Sessão Ativa</p>
               <p className="text-[10px] font-bold text-white truncate">{operatorEmail.split('@')[0]}</p>
             </div>
             <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <span className="text-[9px] font-black text-zinc-800 uppercase tracking-[0.4em]">Bibliotecas</span>
            <button onClick={() => { const n=prompt("Nome da Nova Pasta:"); if(n) onCreateFolder(n); }} className="text-[14px] text-zinc-600 hover:text-white">+</button>
          </div>
          <div className="space-y-2">
            <div onClick={() => onSelectFolder(undefined)} className={`px-5 py-4 rounded-2xl cursor-pointer transition-all ${!activeFolderId ? 'bg-white/5 text-white border border-white/10 shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}>
              <span className="text-[10px] font-black uppercase tracking-widest">Histórico Geral</span>
            </div>
            {folders.map(f => (
              <div key={f.id} className="group flex items-center">
                <div onClick={() => onSelectFolder(f.id)} className={`flex-1 px-5 py-4 rounded-2xl cursor-pointer transition-all ${activeFolderId === f.id ? 'bg-white/5 text-white border border-white/10 shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest truncate block">{f.name}</span>
                </div>
                <button onClick={() => onDeleteFolder(f.id)} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 px-2 text-red-500 transition-opacity">×</button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <span className="text-[9px] font-black text-zinc-800 uppercase tracking-[0.4em] block mb-6 px-2">Acesso Rápido</span>
          <div className="grid grid-cols-2 gap-3">
            {projects.slice(0, 4).map(p => (
              <div key={p.id} onClick={() => onSelectProject(p)} className={`aspect-square rounded-xl overflow-hidden border border-white/5 cursor-pointer hover:border-white/20 transition-all ${activeProjectId === p.id ? 'ring-2 ring-indigo-500 scale-95' : 'opacity-40 hover:opacity-100'}`}>
                <img src={p.versions[0]?.imageUrl || p.originalAlignedUrl} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-8 border-t border-white/5 bg-black/40">
        <div className="flex items-center justify-between text-[8px] font-black text-zinc-600 uppercase mb-4 tracking-widest">
          <span>Banco Local</span>
          <span>{storageSize}</span>
        </div>
        <button onClick={onClearHistory} className="w-full py-4 text-[9px] font-black uppercase text-zinc-700 hover:text-red-500 transition-colors">Limpar Cache Industrial</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#010101] text-white overflow-hidden font-['Plus_Jakarta_Sans']">
      <aside className="hidden lg:flex flex-col w-72 border-r border-white/5 z-20">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col relative">
        <header className="h-20 px-10 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-xl z-10 shrink-0">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
               <span className="text-white">Studio Master</span>
               <span className="w-1 h-1 bg-zinc-800 rounded-full"></span>
               <span className="truncate max-w-[150px]">{operatorEmail}</span>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => window.location.reload()} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
