
import React, { useState, useEffect } from 'react';
import { ProcessingResult, Folder } from '../types';
import { getStorageUsage } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  projects: ProcessingResult[];
  folders: Folder[];
  activeProjectId?: string;
  activeFolderId?: string;
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
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [storageSize, setStorageSize] = useState('0.00 MB');

  useEffect(() => {
    updateSize();
  }, [projects]);

  const updateSize = async () => {
    const size = await getStorageUsage();
    setStorageSize(size);
  };

  const filteredProjects = activeFolderId 
    ? projects.filter(p => p.folderId === activeFolderId)
    : projects;

  const currentFolder = folders.find(f => f.id === activeFolderId);
  const currentFolderName = currentFolder?.name || 'VFX_MASTER_STREAM';

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#050505]">
      <div className="p-10 shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-none">VisionOS</h2>
            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-[0.3em] mt-1">HYBRID v4.5</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em]">Engines Status</span>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Flash 2.5</span>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[7px] font-black rounded-full">ATIVO</span>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Pro 3.0</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[7px] font-black rounded-full">PRONTO</span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em]">Bibliotecas</span>
            <button onClick={() => setShowFolderInput(true)} className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>

          <div className="space-y-2">
            <div onClick={() => onSelectFolder(undefined)} className={`flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer transition-all ${!activeFolderId ? 'bg-indigo-600/10 text-white border border-indigo-500/20' : 'text-zinc-600 hover:bg-white/5'}`}>
              <span className="text-[11px] font-black uppercase tracking-widest">Stream Global</span>
              <span className="text-[9px] font-bold opacity-30">{projects.length}</span>
            </div>

            {showFolderInput && (
              <form onSubmit={(e) => { e.preventDefault(); if(newFolderName.trim()){ onCreateFolder(newFolderName.trim()); setNewFolderName(''); setShowFolderInput(false); } }} className="px-2">
                <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onBlur={() => !newFolderName && setShowFolderInput(false)} className="w-full bg-zinc-900 border border-indigo-500/30 rounded-2xl px-5 py-4 text-[11px] font-bold text-white outline-none" placeholder="Nova pasta..." />
              </form>
            )}

            {folders.map(folder => (
              <div key={folder.id} onClick={() => onSelectFolder(folder.id)} className={`group flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer transition-all ${activeFolderId === folder.id ? 'bg-indigo-600/10 text-white border border-indigo-500/20' : 'text-zinc-600 hover:bg-white/5'}`}>
                <span className="text-[11px] font-black uppercase tracking-widest truncate">{folder.name}</span>
                <button onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }} className="hidden group-hover:block text-zinc-800 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] px-2 block mb-6">Últimos Ativos</span>
          <div className="grid grid-cols-2 gap-3">
            {filteredProjects.map((p) => (
              <div key={p.id} onClick={() => onSelectProject(p)} className={`aspect-square rounded-2xl overflow-hidden border transition-all cursor-pointer ${activeProjectId === p.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/5 opacity-40 hover:opacity-100'}`}>
                <img src={p.versions[0]?.imageUrl || p.originalAlignedUrl} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-8 border-t border-white/5 space-y-4 bg-black/40 backdrop-blur-md">
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-black text-zinc-600 uppercase">Espaço Local</span>
            <span className="text-[8px] font-black text-indigo-400">{storageSize}</span>
          </div>
          <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500" style={{ width: `${Math.min(parseFloat(storageSize) * 2, 100)}%` }}></div>
          </div>
        </div>
        <button onClick={onClearHistory} className="w-full py-4 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Limpar Cache</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#020202] text-white overflow-hidden selection:bg-indigo-500/30 font-['Plus_Jakarta_Sans']">
      <aside className="hidden lg:flex flex-col w-80 border-r border-white/5 z-20">
        <SidebarContent />
      </aside>

      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-500 ${isMobileMenuOpen ? 'visible bg-black/95 backdrop-blur-md' : 'invisible opacity-0'}`}>
        <aside className={`absolute left-0 top-0 bottom-0 w-80 transition-transform duration-500 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent />
        </aside>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-24 px-10 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-3xl z-10 shrink-0">
          <div className="flex items-center gap-8">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-3 bg-white/5 rounded-2xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg></button>
            <div className="flex items-center gap-3 text-zinc-600 text-[11px] font-black uppercase tracking-widest">
              <span className="text-indigo-500">Dual_Engine_Mode</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
              <span className="text-white">{currentFolderName}</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 px-6 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Security: LOCAL_PERSISTENCE_ENABLED</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.02),transparent)] pointer-events-none"></div>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
