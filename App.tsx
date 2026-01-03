
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { processImageRequest } from './services/gemini';
import { ProcessingResult, ViewMode, Folder, AspectRatio, ImageSize, ModelMode } from './types';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { 
  getAllProjects, 
  saveProject, 
  deleteProject, 
  clearAllProjects,
  getAllFolders,
  saveFolder,
  deleteFolder,
  updateProjectFolder
} from './services/storage';

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [projects, setProjects] = useState<ProcessingResult[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(undefined);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'info' | 'success' | 'warning' } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.COMPARISON); // Inicia no Studio para ação rápida
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const operatorEmail = "emerson.cordeiro00894687@sesisenaipr.org.br";
  const [modelMode, setModelMode] = useState<ModelMode>('Standard');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenImage(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const refreshData = async () => {
    const p = await getAllProjects();
    const f = await getAllFolders();
    setProjects(p);
    setFolders(f);
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setResult(null);
      setCommand('');
      setViewMode(ViewMode.COMPARISON);
      setStatusMsg({ text: "ARQUIVO CARREGADO DO PC", type: 'success' });
      setTimeout(() => setStatusMsg(null), 2000);
    };
    reader.readAsDataURL(file);
  };

  const masterReset = () => {
    setSelectedImage(null);
    setResult(null);
    setCommand('');
    setViewMode(ViewMode.COMPARISON);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const downloadAsset = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `VISION-RENDER-${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatusMsg({ text: "SALVO EM SEU COMPUTADOR", type: 'success' });
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const viewProjectHistory = (p: ProcessingResult) => {
    setResult(p);
    setSelectedImage(p.originalAlignedUrl || null);
    setViewMode(ViewMode.COMPARISON);
  };

  const useProjectAsBase = (p: ProcessingResult) => {
    setSelectedImage(p.versions[0].imageUrl);
    setResult(null);
    setCommand('');
    setViewMode(ViewMode.COMPARISON);
  };

  const handleRun = async () => {
    if (!selectedImage || isProcessing) return;

    if (modelMode === 'Pro') {
      const aistudio = (window as any).aistudio;
      if (aistudio && !(await aistudio.hasSelectedApiKey())) {
        await aistudio.openSelectKey();
      }
    }
    
    setIsProcessing(true);
    setStatusMsg({ text: "SINCRO COM O MOTOR EM CURSO...", type: 'warning' });
    
    try {
      const data: any = await processImageRequest(selectedImage, command, modelMode, aspectRatio, imageSize);
      
      if (data.error) {
        setStatusMsg({ text: data.error, type: 'error' });
        setIsProcessing(false);
        return;
      }

      const dataWithFolder = { ...data, folderId: activeFolderId };
      await saveProject(dataWithFolder);
      setResult(dataWithFolder);
      await refreshData();
      
      setStatusMsg({ text: "PROCESSO FINALIZADO", type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
      
    } catch (e: any) {
      setStatusMsg({ text: "FALHA NA CONEXÃO", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout 
      projects={projects} 
      folders={folders}
      activeProjectId={result?.id} 
      activeFolderId={activeFolderId}
      operatorEmail={operatorEmail}
      onSelectProject={viewProjectHistory}
      onDeleteProject={async id => { await deleteProject(id); refreshData(); setResult(null); }}
      onClearHistory={async () => { if(confirm("Limpar base de dados interna?")) { await clearAllProjects(); refreshData(); setResult(null); } }}
      onGeneratePython={() => {}}
      onCreateFolder={async n => { await saveFolder({id: `DIR-${Date.now()}`, name: n, timestamp: Date.now()}); refreshData(); }}
      onSelectFolder={(id) => { setActiveFolderId(id); setViewMode(ViewMode.HISTORY); }}
      onDeleteFolder={async id => { await deleteFolder(id); refreshData(); }}
      onMoveProject={updateProjectFolder}
    >
      <div className="max-w-[1700px] mx-auto px-10 py-10 space-y-12 pb-40">
        
        {/* CABEÇALHO DE COMANDO RÁPIDO */}
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-[#050505] p-8 rounded-[3rem] border border-white/5 shadow-2xl">
           <div className="flex gap-6">
              <button 
                onClick={masterReset} 
                className="px-10 py-5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3 shadow-[0_10px_30px_rgba(220,38,38,0.3)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                Começar do Zero
              </button>
              <button 
                onClick={() => setViewMode(ViewMode.HISTORY)} 
                className="px-10 py-5 bg-zinc-900 border border-white/10 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all"
              >
                Ver Histórico
              </button>
           </div>
           
           <div className="flex gap-4">
              <div className="px-6 py-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl text-center">
                 <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Assets no Banco</p>
                 <p className="text-[12px] font-black text-white">{projects.length}</p>
              </div>
              <div className="px-6 py-4 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl text-center">
                 <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Sincronização</p>
                 <p className="text-[12px] font-black text-white uppercase tracking-tighter">ONLINE</p>
              </div>
           </div>
        </div>

        {statusMsg && (
          <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[60] px-12 py-6 rounded-3xl border backdrop-blur-3xl shadow-2xl animate-in slide-in-from-bottom-10 ${statusMsg.type === 'error' ? 'bg-red-500/20 border-red-500 text-red-200' : 'bg-emerald-500/20 border-emerald-500 text-emerald-100'}`}>
             <p className="text-[11px] font-black uppercase tracking-[0.4em]">{statusMsg.text}</p>
          </div>
        )}

        {viewMode === ViewMode.HISTORY ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5">
             <div className="flex justify-between items-end border-b border-white/5 pb-8">
                <div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter">Explorador de Arquivos</h2>
                   <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-2">Clique em "Editar como Base" para re-injetar um render no motor.</p>
                </div>
                <button onClick={() => setViewMode(ViewMode.COMPARISON)} className="px-8 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl hover:scale-105 transition-all">Voltar ao Studio</button>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
               <div onClick={masterReset} className="aspect-square bg-indigo-600/5 rounded-[3rem] border-2 border-dashed border-indigo-500/20 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-600/10 hover:border-indigo-500 transition-all group">
                  <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-6 text-indigo-400">Importar Novo</p>
               </div>
               {projects.map(p => (
                 <div key={p.id} className="group relative aspect-square bg-zinc-900/40 rounded-[3rem] border border-white/5 overflow-hidden transition-all hover:border-white/20">
                    <img src={p.versions[0].imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]" />
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-10 space-y-4 text-center">
                       <button onClick={() => useProjectAsBase(p)} className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all">Editar Base</button>
                       <button onClick={() => downloadAsset(p.versions[0].imageUrl, p.id)} className="w-full py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all">Salvar no PC</button>
                       <button onClick={() => {if(confirm("Excluir?")) {deleteProject(p.id); refreshData();}}} className="text-[9px] font-black text-red-500 uppercase tracking-widest pt-4">Excluir Asset</button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-700">
            {/* PAINEL DE CONTROLE ESQUERDO */}
            <div className="lg:col-span-4 space-y-8">
               <div className="bg-[#080808] p-10 rounded-[4rem] border border-white/5 space-y-10 shadow-2xl">
                  <div>
                    <label className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.6em] mb-6 block px-2">Comandos da IA</label>
                    <textarea 
                      value={command}
                      onChange={e => setCommand(e.target.value)}
                      className="w-full bg-zinc-900/40 p-8 rounded-[2.5rem] text-sm outline-none border border-white/5 focus:border-indigo-500/50 transition-all min-h-[180px] leading-relaxed"
                      placeholder="Descreva as modificações. Ex: 'Adicionar jaqueta de couro preta e mudar cenário para Tóquio à noite'..."
                    />
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => setModelMode('Standard')} className={`py-5 rounded-2xl text-[10px] font-black border transition-all ${modelMode === 'Standard' ? 'bg-white text-black border-white shadow-xl' : 'border-white/5 text-zinc-600'}`}>FLASH FREE</button>
                       <button onClick={() => setModelMode('Pro')} className={`py-5 rounded-2xl text-[10px] font-black border transition-all ${modelMode === 'Pro' ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl' : 'border-white/5 text-zinc-600'}`}>PRO MASTER</button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {["1:1", "16:9", "9:16", "4:3", "3:4"].map(r => (
                        <button key={r} onClick={() => setAspectRatio(r as AspectRatio)} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${aspectRatio === r ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'border-white/5 text-zinc-700'}`}>{r}</button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleRun}
                    disabled={isProcessing || !selectedImage}
                    className={`w-full py-7 rounded-[2rem] font-black text-[14px] uppercase tracking-[0.8em] transition-all ${isProcessing ? 'bg-zinc-800 text-zinc-600' : 'bg-white text-black hover:bg-zinc-100 shadow-[0_30px_60px_rgba(255,255,255,0.05)] active:scale-95'}`}
                  >
                    {isProcessing ? 'SINCRO EM CURSO...' : 'LIBERAR RENDER'}
                  </button>
               </div>
            </div>

            {/* VIEWPORT CENTRAL */}
            <div className="lg:col-span-8 space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* SLOT 01: ORIGEM DO PC */}
                  <div className="space-y-6">
                     <p className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.5em] px-8">Input do Computador</p>
                     <div 
                        onClick={masterReset}
                        className="aspect-square bg-zinc-900/20 rounded-[4.5rem] border border-white/5 relative group cursor-pointer overflow-hidden flex items-center justify-center hover:border-white/20 transition-all shadow-inner"
                     >
                        {selectedImage ? (
                           <img src={selectedImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s]" />
                        ) : (
                           <div className="text-center space-y-6 opacity-30 group-hover:opacity-100 transition-opacity p-10">
                              <div className="w-24 h-24 rounded-full border-2 border-white/10 flex items-center justify-center mx-auto mb-4">
                                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                              </div>
                              <p className="text-[13px] font-black uppercase tracking-[0.5em] text-white">Adicionar Asset Local</p>
                              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Clique aqui para abrir seu PC</p>
                           </div>
                        )}
                        {selectedImage && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                             <p className="text-[10px] font-black uppercase tracking-widest text-white border-b border-white/50 pb-2">Trocar Arquivo do PC</p>
                          </div>
                        )}
                     </div>
                  </div>

                  {/* SLOT 02: OUTPUT RENDERIZADO */}
                  <div className="space-y-6">
                     <p className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.5em] px-8">Output do Motor AI</p>
                     <div className="aspect-square bg-[#030303] rounded-[4.5rem] border border-white/5 relative overflow-hidden flex items-center justify-center shadow-2xl">
                        {isProcessing ? (
                           <div className="text-center">
                              <div className="w-24 h-24 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-10 shadow-[0_0_50px_rgba(99,102,241,0.2)]"></div>
                              <p className="text-[11px] font-black uppercase text-white tracking-[0.6em] animate-pulse">Sincronizando Pixels...</p>
                           </div>
                        ) : result ? (
                           <>
                              <BeforeAfterSlider before={selectedImage || ''} after={result.versions[0].imageUrl} />
                              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-4">
                                 <button 
                                   onClick={() => downloadAsset(result.versions[0].imageUrl, result.id)}
                                   className="px-10 py-5 bg-white text-black text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-110 transition-all shadow-2xl"
                                 >
                                   Salvar no Meu PC
                                 </button>
                                 <button onClick={() => setFullscreenImage(result.versions[0].imageUrl)} className="p-5 bg-black/60 backdrop-blur-3xl rounded-2xl border border-white/10 text-white">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                 </button>
                              </div>
                           </>
                        ) : (
                           <div className="text-center opacity-20 p-10">
                              <p className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-500">Renderizador Aguardando</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* INPUT DE ARQUIVO OCULTO */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} 
          className="hidden" 
          accept="image/*"
        />
      </div>

      {fullscreenImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => setFullscreenImage(null)}></div>
          <img src={fullscreenImage} className="relative max-w-full max-h-full object-contain rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,1)]" />
          <button onClick={() => setFullscreenImage(null)} className="absolute top-12 right-12 p-6 bg-white/10 text-white rounded-full border border-white/10 hover:bg-red-500 transition-all">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      )}
    </Layout>
  );
};

export default App;
