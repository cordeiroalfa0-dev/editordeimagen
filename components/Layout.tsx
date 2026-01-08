
import React, { useState, useEffect } from 'react';
import { ProcessingResult, Folder } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  projects: ProcessingResult[];
  folders: Folder[];
  activeProjectId?: string;
  activeFolderId?: string;
  selectedBaseUrl?: string | null;
  operatorEmail: string;
  onSelectProject: (project: ProcessingResult) => void;
  onDeleteProject: (id: string) => Promise<void>;
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
  selectedBaseUrl,
  operatorEmail,
  onSelectProject, 
  onDeleteProject,
  onClearHistory,
  onCreateFolder,
  onSelectFolder,
  onDeleteFolder
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    if (projects.length >= 0) {
      setTimeout(() => setIsSyncing(false), 800);
    }
  }, [projects]);

  const filteredProjects = activeFolderId 
    ? projects.filter(p => p.folderId === activeFolderId)
    : projects;

  const sortedProjects = [...filteredProjects].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a0a0b] border-r border-white/10 pb-safe">
      <div className="p-10 shrink-0 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#e11d48] text-white rounded-[1.25rem] flex items-center justify-center shadow-[0_0_30px_rgba(225,29,72,0.4)] border border-white/10">
             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 5a3 3 0 0 1 6 0v3H9V7zm3 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">VisionOS</h2>
            <p className="text-[10px] font-black text-[#e11d48] uppercase tracking-[0.4em] mt-1">V15 MASTER PRO</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-10 space-y-12 custom-scrollbar">
        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Diretórios Selados</span>
            <button onClick={() => { const n=prompt("NOME DA NOVA PASTA:"); if(n) onCreateFolder(n); }} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-[#e11d48] text-xl transition-all shadow-inner">+</button>
          </div>
          <div className="space-y-2">
            <div onClick={() => onSelectFolder(undefined)} className={`px-5 py-4 rounded-2xl text-[12px] font-black uppercase cursor-pointer transition-all border ${!activeFolderId ? 'bg-white/10 border-white/10 text-white shadow-xl' : 'border-transparent text-zinc-600 hover:text-white hover:bg-white/5'}`}>
              <div className="flex items-center gap-3">
                 <div className={`w-2 h-2 rounded-full ${!activeFolderId ? 'bg-[#e11d48]' : 'bg-zinc-800'}`}></div>
                 RAIZ_MASTER (GLOBAL)
              </div>
            </div>
            {folders.map(f => (
              <div key={f.id} onClick={() => onSelectFolder(f.id)} className={`px-5 py-4 rounded-2xl text-[12px] font-black uppercase cursor-pointer transition-all border flex justify-between items-center group ${activeFolderId === f.id ? 'bg-white/10 border-white/10 text-white shadow-xl' : 'border-transparent text-zinc-600 hover:text-white hover:bg-white/5'}`}>
                <div className="flex items-center gap-3 truncate">
                   <div className={`w-2 h-2 rounded-full shrink-0 ${activeFolderId === f.id ? 'bg-[#e11d48]' : 'bg-zinc-800'}`}></div>
                   <span className="truncate">{f.name}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); if(confirm("Deletar diretório permanente?")) onDeleteFolder(f.id); }} className="opacity-0 group-hover:opacity-100 text-[#e11d48] hover:scale-125 transition-all p-1">✕</button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6 px-2">
             <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Banco de Renders</span>
             <span className="text-[9px] font-bold text-zinc-800 uppercase">{sortedProjects.length} ITENS</span>
          </div>
          {sortedProjects.length === 0 && !isSyncing ? (
            <div className="p-12 text-center border-4 border-dashed border-white/5 rounded-[3rem] bg-black/20">
               <svg className="w-10 h-10 text-zinc-800 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
               <p className="text-[10px] font-black text-zinc-800 uppercase tracking-widest leading-relaxed">SESSÃO VAZIA NO MOMENTO</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {sortedProjects.map(p => {
                const isBase = p.versions[0]?.imageUrl === selectedBaseUrl;
                return (
                  <div key={p.id} onClick={() => onSelectProject(p)} className={`aspect-square rounded-3xl overflow-hidden border transition-all cursor-pointer relative group shadow-2xl ${activeProjectId === p.id ? 'border-[#e11d48] ring-4 ring-[#e11d48]/40 scale-95' : 'border-white/5 opacity-50 hover:opacity-100 hover:scale-105'}`}>
                    <img src={p.versions[0]?.imageUrl} className="w-full h-full object-cover" loading="lazy" />
                    
                    {/* BOTÃO EXCLUIR RÁPIDO - REDENHADO PARA MÁXIMA CLAREZA */}
                    <button 
                      onClick={async (e) => { 
                        e.stopPropagation(); 
                        if(confirm("Confirmar exclusão definitiva do banco master?")) {
                          await onDeleteProject(p.id);
                        }
                      }}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-[30] shadow-[0_0_15px_rgba(225,29,72,0.5)] border border-white/20 active:scale-75"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>

                    {isBase && (
                      <div className="absolute bottom-2 left-2 bg-[#e11d48] p-1.5 rounded-lg shadow-2xl">
                         <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 5a3 3 0 0 1 6 0v3H9V7z"/></svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="p-10 border-t border-white/5 space-y-4 bg-black/20">
        <button onClick={onClearHistory} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-red-500 transition-all bg-white/5 rounded-2xl border border-white/5 hover:border-red-500/30">Resetar Todo o Banco</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#0a0a0b] text-white overflow-hidden">
      <aside className="hidden lg:flex flex-col w-[380px] z-20"><SidebarContent /></aside>
      
      <div className={`fixed inset-0 z-[600] lg:hidden transition-all ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setIsSidebarOpen(false)}></div>
        <aside className={`absolute top-0 left-0 bottom-0 w-[320px] transition-transform duration-500 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <SidebarContent />
        </aside>
      </div>

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="h-24 px-10 flex items-center justify-between border-b border-white/5 bg-[#0a0a0b]/90 backdrop-blur-2xl z-10">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 text-white bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
               <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div className="hidden md:flex flex-col">
               <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Status de Conectividade</span>
               <div className="flex items-center gap-3">
                 <div className={`w-3 h-3 rounded-full ${isSyncing ? 'bg-[#e11d48] animate-ping shadow-[0_0_15px_#e11d48]' : 'bg-emerald-500 shadow-[0_0_15px_#10b981]'}`}></div>
                 <span className="text-[12px] font-black text-white uppercase tracking-tighter">
                   {isSyncing ? 'SINCRONIZANDO COM A NUVEM...' : `BANCO ATIVO: ${projects.length} RENDERS SELADOS`}
                 </span>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-[#e11d48] uppercase tracking-widest leading-none mb-1">Identidade Master</span>
                <div className="flex items-center gap-3">
                   <span className="text-[11px] font-black text-white/50 lowercase tracking-tight">{operatorEmail}</span>
                   <div className="w-3 h-3 bg-[#e11d48] rounded-full shadow-[0_0_20px_#e11d48]"></div>
                </div>
             </div>
             <div className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center font-black text-sm border border-[#e11d48]/40 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-105 transition-all cursor-default">V15</div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-[radial-gradient(circle_at_top_right,rgba(225,29,72,0.03),transparent_40%)]">
           {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
