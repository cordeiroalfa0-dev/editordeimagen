
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
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.COMPARISON);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const operatorEmail = "emerson.cordeiro00894687@sesisenaipr.org.br";
  const [modelMode, setModelMode] = useState<ModelMode>('Standard');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [genMode, setGenMode] = useState<'Edit' | 'Create'>('Edit');

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenImage(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

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
      setGenMode('Edit');
      setViewMode(ViewMode.COMPARISON);
      setStatusMsg({ text: "ASSET_SINCRONIZADO", type: 'success' });
      setTimeout(() => setStatusMsg(null), 2000);
    };
    reader.readAsDataURL(file);
  };

  const openFileSelector = () => fileInputRef.current?.click();
  const openCamera = () => cameraInputRef.current?.click();

  const downloadAsset = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `VISION-OS-V3-${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewProjectHistory = (p: ProcessingResult) => {
    setResult(p);
    setSelectedImage(p.originalAlignedUrl || null);
    setGenMode(p.originalAlignedUrl ? 'Edit' : 'Create');
    setViewMode(ViewMode.COMPARISON);
  };

  const useProjectAsBase = (p: ProcessingResult) => {
    setSelectedImage(p.versions[0].imageUrl);
    setResult(null);
    setGenMode('Edit');
    setViewMode(ViewMode.COMPARISON);
  };

  const handleRun = async () => {
    if (isProcessing) return;
    if (genMode === 'Edit' && !selectedImage) {
      setStatusMsg({ text: "IMAGEM_OBRIGATÓRIA", type: 'warning' });
      return;
    }
    if (command.trim().length < 3) {
      setStatusMsg({ text: "PROMPT_VAZIO", type: 'warning' });
      return;
    }

    if (modelMode === 'Pro') {
      const aistudio = (window as any).aistudio;
      if (aistudio && !(await aistudio.hasSelectedApiKey())) {
        await aistudio.openSelectKey();
      }
    }
    
    setIsProcessing(true);
    setStatusMsg({ text: "SINTETIZANDO_BLOCOS...", type: 'warning' });
    
    try {
      const imageToProcess = genMode === 'Edit' ? selectedImage : null;
      const data: any = await processImageRequest(imageToProcess as string, command, modelMode, aspectRatio, imageSize);
      
      if (data.error) {
        setStatusMsg({ text: data.error, type: 'error' });
        setIsProcessing(false);
        return;
      }

      const dataWithFolder = { ...data, folderId: activeFolderId };
      await saveProject(dataWithFolder);
      setResult(dataWithFolder);
      await refreshData();
      
      setStatusMsg({ text: "SÍNTESE_CONCLUÍDA", type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
      
    } catch (e: any) {
      setStatusMsg({ text: "FALHA_CONEXÃO_DADOS", type: 'error' });
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
      onClearHistory={async () => { if(confirm("LIMPAR_DADOS?")) { await clearAllProjects(); refreshData(); setResult(null); } }}
      onGeneratePython={() => {}}
      onCreateFolder={async n => { await saveFolder({id: `DIR-${Date.now()}`, name: n, timestamp: Date.now()}); refreshData(); }}
      onSelectFolder={(id) => { setActiveFolderId(id); setViewMode(ViewMode.HISTORY); }}
      onDeleteFolder={async id => { await deleteFolder(id); refreshData(); }}
      onMoveProject={updateProjectFolder}
      onInstallApp={deferredPrompt ? installPWA : undefined}
    >
      <div className="max-w-[1800px] mx-auto px-4 md:px-12 py-6 md:py-10 space-y-8 md:space-y-12 pb-32 fade-in-studio">
        
        {/* BARRA DE STATUS SUPERIOR */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-between items-stretch sm:items-center bg-zinc-900/40 backdrop-blur-3xl p-4 sm:p-6 rounded-[2rem] sm:rounded-[3rem] border border-white/5 shadow-2xl">
           <div className="flex flex-1 gap-2 sm:gap-4">
              <button 
                onClick={() => setViewMode(ViewMode.COMPARISON)} 
                className={`flex-1 sm:flex-none px-6 sm:px-12 py-4 sm:py-5 rounded-2xl text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] transition-all neo-button ${viewMode === ViewMode.COMPARISON ? 'bg-white text-black shadow-xl' : 'bg-white/5 text-zinc-500 border border-white/5 hover:bg-white/10'}`}
              >
                ESTÚDIO_MESTRE
              </button>
              <button 
                onClick={() => setViewMode(ViewMode.HISTORY)} 
                className={`flex-1 sm:flex-none px-6 sm:px-12 py-4 sm:py-5 rounded-2xl text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] transition-all neo-button ${viewMode === ViewMode.HISTORY ? 'bg-white text-black shadow-xl' : 'bg-white/5 text-zinc-500 border border-white/5 hover:bg-white/10'}`}
              >
                ARQUIVO_LOCAL
              </button>
           </div>
           
           <div className="hidden sm:flex gap-6 items-center pr-4">
              <div className="text-right">
                 <p className="text-[8px] font-black text-[#9b1b30] uppercase tracking-widest">Motor_Principal</p>
                 <p className="text-[11px] font-black text-white uppercase tracking-tighter">VisionOS_V3.0</p>
              </div>
              <div className="h-10 w-px bg-white/10"></div>
              <div className="text-right">
                 <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Nós_Sincronizados</p>
                 <p className="text-[11px] font-black text-white">{projects.length}</p>
              </div>
           </div>
        </div>

        {statusMsg && (
          <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm px-8 py-5 rounded-2xl border backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-10 ${statusMsg.type === 'error' ? 'bg-red-950/20 text-red-200 border-red-500/50' : 'bg-[#9b1b30]/10 text-rose-100 border-[#9b1b30]/50'}`}>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-center">{statusMsg.text}</p>
          </div>
        )}

        {viewMode === ViewMode.HISTORY ? (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="border-b border-white/10 pb-8">
                <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Repositório_de_Nós</h2>
                <p className="text-[10px] sm:text-[11px] font-bold text-zinc-600 uppercase tracking-[0.4em] mt-2">Banco de dados em arquitetura grafite e vinho.</p>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-8">
               {projects.map(p => (
                 <div key={p.id} className="group relative aspect-square bg-zinc-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden transition-all hover:border-[#9b1b30]/50 hover:shadow-[0_0_40px_rgba(155,27,48,0.15)]">
                    <img src={p.versions[0].imageUrl} className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-lg opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-8 space-y-4">
                       <button onClick={() => useProjectAsBase(p)} className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl">Recarregar</button>
                       <button onClick={() => downloadAsset(p.versions[0].imageUrl, p.id)} className="w-full py-4 bg-[#9b1b30] text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Exportar</button>
                       <button onClick={() => {if(confirm("EXCLUIR_NÓ?")) {deleteProject(p.id); refreshData();}}} className="text-[8px] font-black text-zinc-500 uppercase tracking-widest pt-2 hover:text-red-500">Excluir</button>
                    </div>
                 </div>
               ))}
               {projects.length === 0 && (
                 <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[4rem] opacity-20">
                   <p className="text-[11px] font-black uppercase tracking-[1em]">Repositório_Vazio</p>
                 </div>
               )}
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            {/* BLOCO DE CONTROLE */}
            <div className="lg:col-span-4 space-y-8">
               <div className="glass-panel p-8 sm:p-12 rounded-[3.5rem] space-y-8 sm:space-y-12 shadow-[0_80px_160px_rgba(0,0,0,0.8)]">
                  
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] px-2">Modo_do_Pipeline</label>
                    <div className="flex gap-2 p-1.5 bg-black/40 rounded-[1.5rem] border border-white/5">
                       <button onClick={() => setGenMode('Edit')} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${genMode === 'Edit' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}>Editar_Buffer</button>
                       <button onClick={() => setGenMode('Create')} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${genMode === 'Create' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}>Sintetizar_Puro</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] px-2">Comando_Operacional</label>
                    <textarea 
                      value={command}
                      onChange={e => setCommand(e.target.value)}
                      className="w-full bg-black/60 p-8 rounded-[2rem] text-sm outline-none border border-white/5 focus:border-[#9b1b30]/50 transition-all min-h-[160px] custom-scrollbar leading-relaxed placeholder:text-zinc-800"
                      placeholder={genMode === 'Edit' ? "Defina os ajustes estruturais..." : "Descreva os atributos da síntese..."}
                    />
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => setModelMode('Standard')} className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${modelMode === 'Standard' ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'border-white/5 text-zinc-600'}`}>Modo_Flash</button>
                       <button onClick={() => setModelMode('Pro')} className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${modelMode === 'Pro' ? 'bg-[#9b1b30] text-white border-[#9b1b30] shadow-[0_0_30px_rgba(155,27,48,0.4)]' : 'border-white/5 text-zinc-600'}`}>Pro_Ultra</button>
                    </div>
                  </div>

                  <button 
                    onClick={handleRun}
                    disabled={isProcessing}
                    className={`w-full py-8 sm:py-9 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.8em] transition-all neo-button ${isProcessing ? 'bg-zinc-950 text-zinc-800 cursor-not-allowed' : 'bg-white text-black hover:scale-[1.01] shadow-[0_30px_60px_rgba(0,0,0,0.4)] active:scale-95'}`}
                  >
                    {isProcessing ? 'SINTETIZANDO...' : 'INICIAR_SÍNTESE'}
                  </button>
               </div>
            </div>

            {/* BUFFER_DE_VISUALIZAÇÃO */}
            <div className="lg:col-span-8 space-y-12">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-12">
                  {/* ENTRADA */}
                  <div className={`space-y-6 transition-all duration-1000 ${genMode === 'Create' ? 'opacity-10 grayscale scale-95 pointer-events-none' : ''}`}>
                     <div className="flex justify-between items-center px-6">
                        <p className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.5em]">Buffer_Entrada</p>
                        <div className="flex gap-6">
                           <button onClick={openCamera} className="text-[10px] font-black text-[#9b1b30] uppercase tracking-widest sm:hidden">Capturar</button>
                           <button onClick={openFileSelector} className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors">Carregar_Asset</button>
                        </div>
                     </div>
                     <div 
                        onClick={genMode === 'Edit' ? openFileSelector : undefined}
                        className="aspect-square bg-zinc-950/40 rounded-[4.5rem] border border-white/5 relative overflow-hidden flex items-center justify-center cursor-pointer group shadow-inner"
                     >
                        <div className="absolute inset-0 scanline opacity-10"></div>
                        {selectedImage ? (
                           <img src={selectedImage} className="w-full h-full object-cover transition-transform duration-[5s] group-hover:scale-105" />
                        ) : (
                           <div className="text-center p-12 opacity-20 group-hover:opacity-100 transition-opacity">
                              <svg className="w-16 h-16 mx-auto mb-6 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              <p className="text-[11px] font-black uppercase tracking-[0.8em]">Entrada_Necessária</p>
                           </div>
                        )}
                        <div className="absolute inset-0 bg-[#9b1b30]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     </div>
                  </div>

                  {/* SAÍDA */}
                  <div className="space-y-6">
                     <p className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.5em] px-6">Fluxo_de_Saída</p>
                     <div className="aspect-square bg-[#030304] rounded-[4.5rem] border border-white/5 relative overflow-hidden flex items-center justify-center shadow-[0_60px_120px_rgba(0,0,0,0.9)]">
                        {isProcessing ? (
                           <div className="text-center">
                              <div className="w-20 h-20 border-[3px] border-[#9b1b30] border-t-transparent rounded-full animate-spin mx-auto mb-10 shadow-[0_0_40px_rgba(155,27,48,0.2)]"></div>
                              <p className="text-[10px] font-black uppercase text-white tracking-[0.8em] animate-pulse">Renderizando_Frames...</p>
                           </div>
                        ) : result ? (
                           <>
                              <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
                              {genMode === 'Edit' && selectedImage ? (
                                <BeforeAfterSlider before={selectedImage} after={result.versions[0].imageUrl} />
                              ) : (
                                <img src={result.versions[0].imageUrl} className="w-full h-full object-cover animate-in zoom-in-95 duration-1000" />
                              )}
                              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-50">
                                 <button onClick={() => downloadAsset(result.versions[0].imageUrl, result.id)} className="px-10 py-5 bg-white text-black text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-2xl neo-button">Baixar</button>
                                 <button onClick={() => setFullscreenImage(result.versions[0].imageUrl)} className="p-5 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 text-white hover:bg-white hover:text-black transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                 </button>
                              </div>
                           </>
                        ) : (
                           <div className="text-center opacity-10 p-12">
                              <p className="text-[11px] font-black uppercase tracking-[1em]">Buffer_Inativo</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* INPUTS OCULTOS */}
        <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" accept="image/*" />
        <input type="file" ref={cameraInputRef} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" accept="image/*" capture="environment" />
      </div>

      {fullscreenImage && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-16 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => setFullscreenImage(null)}></div>
          <img src={fullscreenImage} className="relative max-w-full max-h-full object-contain rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,1)] border border-white/5" />
          <button onClick={() => setFullscreenImage(null)} className="absolute top-8 right-8 p-6 bg-white/5 hover:bg-[#9b1b30] text-white rounded-full border border-white/10 transition-all">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      )}
    </Layout>
  );
};

export default App;
