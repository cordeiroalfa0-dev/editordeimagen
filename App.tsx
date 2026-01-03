
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
      setStatusMsg({ text: "FOTO CARREGADA", type: 'success' });
      setTimeout(() => setStatusMsg(null), 2000);
    };
    reader.readAsDataURL(file);
  };

  const openFileSelector = () => fileInputRef.current?.click();
  const openCamera = () => cameraInputRef.current?.click();

  const downloadAsset = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `VISION-${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewProjectHistory = (p: ProcessingResult) => {
    setResult(p);
    setSelectedImage(p.originalAlignedUrl || null);
    setGenMode(p.originalAlignedUrl ? 'Edit' : 'Create');
    setViewMode(ViewMode.COMPARISON);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRun = async () => {
    if (isProcessing) return;
    
    if (genMode === 'Edit' && !selectedImage) {
      setStatusMsg({ text: "POR FAVOR, CARREGUE UMA FOTO", type: 'warning' });
      return;
    }
    
    if (command.trim().length < 3) {
      setStatusMsg({ text: "DESCREVA SUA IDEIA ANTES", type: 'warning' });
      return;
    }

    // Regra obrigatória para modelos Pro: verificar API Key antes da chamada
    if (modelMode === 'Pro') {
      const aistudio = (window as any).aistudio;
      if (aistudio && !(await aistudio.hasSelectedApiKey())) {
        await aistudio.openSelectKey();
        // O processo continua após o trigger da abertura
      }
    }
    
    setIsProcessing(true);
    setStatusMsg({ text: genMode === 'Create' ? "SINTETIZANDO IMAGEM..." : "RECONSTRUINDO ASSET...", type: 'warning' });
    
    try {
      const imageToProcess = genMode === 'Edit' ? selectedImage : null;
      // Chamada do serviço com nova instância de IA interna
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
      
      setStatusMsg({ text: "RENDER FINALIZADO", type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
      
    } catch (e: any) {
      setStatusMsg({ text: "FALHA CRÍTICA NO SISTEMA", type: 'error' });
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
      onClearHistory={async () => { if(confirm("Deseja apagar todos os renders?")) { await clearAllProjects(); refreshData(); setResult(null); } }}
      onGeneratePython={() => {}}
      onCreateFolder={async n => { await saveFolder({id: `DIR-${Date.now()}`, name: n, timestamp: Date.now()}); refreshData(); }}
      onSelectFolder={(id) => { setActiveFolderId(id); setViewMode(ViewMode.HISTORY); }}
      onDeleteFolder={async id => { await deleteFolder(id); refreshData(); }}
      onMoveProject={updateProjectFolder}
      onInstallApp={deferredPrompt ? installPWA : undefined}
    >
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12 space-y-12 pb-32">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-zinc-900/80 backdrop-blur-3xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
           <div className="flex gap-4 w-full md:w-auto">
              <button 
                onClick={() => setViewMode(ViewMode.COMPARISON)} 
                className={`flex-1 md:flex-none px-12 py-5 rounded-2xl text-xs md:text-base font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-white text-black shadow-lg scale-105' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
              >
                ESTÚDIO
              </button>
              <button 
                onClick={() => setViewMode(ViewMode.HISTORY)} 
                className={`flex-1 md:flex-none px-12 py-5 rounded-2xl text-xs md:text-base font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.HISTORY ? 'bg-white text-black shadow-lg scale-105' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
              >
                ARQUIVOS
              </button>
           </div>
           <div className="hidden lg:flex gap-10 px-8">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
                 <span className="text-xs font-black uppercase tracking-[0.4em] text-zinc-400">ESTADO: ONLINE</span>
              </div>
              <div className="w-px h-6 bg-white/10"></div>
              <div className="text-xs font-black uppercase tracking-[0.4em] text-zinc-400">{projects.length} RENDERS ATIVOS</div>
           </div>
        </div>

        {statusMsg && (
          <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[300] w-[95%] max-w-md px-10 py-6 rounded-3xl glass-panel border-[#e11d48]/50 shadow-[0_0_60px_rgba(225,29,72,0.3)] animate-in slide-in-from-bottom-10`}>
             <p className="text-base font-black uppercase tracking-widest text-center text-white drop-shadow-lg">
               {statusMsg.text}
             </p>
          </div>
        )}

        {viewMode === ViewMode.HISTORY ? (
          <div className="space-y-12 animate-in fade-in duration-700">
             <div className="border-l-8 border-[#e11d48] pl-8 py-3 bg-white/5 rounded-r-3xl">
                <h2 className="text-4xl font-black uppercase tracking-tighter text-white text-wine-glow">REPOSITÓRIO_LOCAL</h2>
                <p className="text-sm font-extrabold text-zinc-400 uppercase tracking-[0.5em] mt-2">Navegação em cache persistente.</p>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
               {projects.map(p => (
                 <div key={p.id} className="group relative aspect-square bg-zinc-900/60 rounded-[3.5rem] border border-white/10 overflow-hidden transition-all hover:border-[#e11d48]/50">
                    <img src={p.versions[0].imageUrl} className="w-full h-full object-cover transition-transform duration-[4s] group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-12 space-y-5">
                       <button onClick={() => viewProjectHistory(p)} className="w-full py-5 bg-white text-black text-sm font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-transform">ABRIR RENDER</button>
                       <button onClick={() => downloadAsset(p.versions[0].imageUrl, p.id)} className="w-full py-5 bg-[#e11d48] text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-[#e11d48]/30">BAIXAR PNG</button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            
            {/* PAINEL LATERAL */}
            <div className="lg:col-span-5 space-y-10">
               <div className="glass-panel p-10 md:p-12 rounded-[4rem] space-y-12">
                  
                  <div className="space-y-6">
                    <label className="label-wine block px-2">MODALIDADE_OPERACIONAL</label>
                    <div className="flex gap-3 p-2 bg-black/60 rounded-3xl border border-white/10">
                       <button 
                         onClick={() => setGenMode('Edit')} 
                         className={`flex-1 py-5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${genMode === 'Edit' ? 'bg-zinc-800 text-white shadow-2xl border border-white/10' : 'text-zinc-600 hover:text-zinc-400'}`}
                       >
                         EDITAR_FOTO
                       </button>
                       <button 
                         onClick={() => setGenMode('Create')} 
                         className={`flex-1 py-5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${genMode === 'Create' ? 'bg-[#e11d48] text-white shadow-[0_0_30px_rgba(225,29,72,0.4)]' : 'text-zinc-600 hover:text-zinc-400'}`}
                       >
                         CRIAR_DO_ZERO
                       </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="label-wine block px-2">DESCRIÇÃO_TÉCNICA</label>
                    <textarea 
                      value={command}
                      onChange={e => setCommand(e.target.value)}
                      className="w-full bg-black/70 p-8 rounded-[2.5rem] text-lg outline-none border border-white/10 focus:border-[#e11d48]/60 transition-all min-h-[220px] leading-relaxed text-white shadow-inner font-medium"
                      placeholder={genMode === 'Create' ? "Ex: Um robô futurista explorando uma floresta bioluminescente, 8k..." : "Ex: Mude a cor do cabelo para azul neon e adicione óculos cyberpunk..."}
                    />
                  </div>

                  <div className="space-y-10">
                    <div className="grid grid-cols-2 gap-5">
                       <button onClick={() => setModelMode('Standard')} className={`py-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${modelMode === 'Standard' ? 'bg-white text-black border-white' : 'border-white/10 text-zinc-500 hover:text-white'}`}>MOTOR_FLASH</button>
                       <button onClick={() => setModelMode('Pro')} className={`py-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${modelMode === 'Pro' ? 'bg-[#e11d48] text-white border-[#e11d48] shadow-[0_0_40px_rgba(225,29,72,0.4)]' : 'border-white/10 text-zinc-500 hover:text-white'}`}>MOTOR_ULTRA_V3</button>
                    </div>
                    
                    <div className="space-y-5">
                      <label className="label-wine block px-2">PROPORÇÃO_RENDER</label>
                      <div className="grid grid-cols-4 gap-3">
                        {["1:1", "16:9", "9:16", "4:3"].map(r => (
                          <button key={r} onClick={() => setAspectRatio(r as AspectRatio)} className={`py-4 rounded-2xl text-xs font-black border transition-all ${aspectRatio === r ? 'bg-white/15 text-white border-white/40' : 'border-white/5 text-zinc-600 hover:text-white'}`}>{r}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleRun}
                    disabled={isProcessing}
                    className={`w-full py-10 rounded-[3.5rem] font-black text-lg uppercase tracking-[0.8em] transition-all neo-button ${isProcessing ? 'bg-zinc-950 text-zinc-800 cursor-not-allowed border-zinc-800' : 'bg-white text-black shadow-2xl active:scale-95'}`}
                  >
                    {isProcessing ? 'SINTETIZANDO...' : genMode === 'Create' ? 'GERAR AGORA' : 'EXECUTAR'}
                  </button>
               </div>
            </div>

            {/* VIEWER AREA */}
            <div className="lg:col-span-7 space-y-16">
               <div className="flex flex-col space-y-12">
                  
                  {/* INPUT SECTION */}
                  <div className={`space-y-6 transition-all duration-700 ${genMode === 'Create' ? 'opacity-20 pointer-events-none grayscale scale-95' : ''}`}>
                     <div className="flex justify-between items-center px-8">
                        <span className="label-wine">BUFFER_ENTRADA</span>
                        {genMode === 'Edit' && (
                          <div className="flex gap-8">
                             <button onClick={openCamera} className="text-sm font-black text-[#e11d48] uppercase md:hidden tracking-tighter">CÂMERA</button>
                             <button onClick={openFileSelector} className="text-sm font-black text-zinc-400 hover:text-white uppercase tracking-widest">SUBSTITUIR</button>
                          </div>
                        )}
                     </div>
                     <div 
                        onClick={genMode === 'Edit' ? openFileSelector : undefined}
                        className={`aspect-square rounded-[4rem] border-2 border-dashed relative overflow-hidden flex items-center justify-center transition-all ${genMode === 'Edit' ? 'bg-black/60 border-white/10 cursor-pointer hover:border-[#e11d48]/40' : 'bg-zinc-900 border-zinc-800'}`}
                     >
                        {genMode === 'Create' ? (
                           <div className="text-center p-16 opacity-30">
                              <p className="text-lg font-black uppercase tracking-[0.5em]">GERAÇÃO TEXTUAL ATIVA</p>
                              <p className="text-xs font-bold mt-2">Nenhum arquivo de entrada necessário</p>
                           </div>
                        ) : selectedImage ? (
                           <img src={selectedImage} className="w-full h-full object-cover transition-transform duration-[6s]" />
                        ) : (
                           <div className="text-center p-16 opacity-40">
                              <svg className="w-20 h-20 mx-auto mb-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              <p className="text-base font-black uppercase tracking-[0.8em]">CARREGAR FOTO</p>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* OUTPUT SECTION */}
                  <div className="space-y-6">
                     <span className="label-wine px-8 block">OUTPUT_FINAL_RENDER</span>
                     <div className="aspect-square bg-[#050507] rounded-[4rem] border-2 border-white/10 relative overflow-hidden flex items-center justify-center shadow-[0_80px_160px_rgba(0,0,0,1)]">
                        {isProcessing ? (
                           <div className="text-center">
                              <div className="w-24 h-24 border-[6px] border-[#e11d48] border-t-transparent rounded-full animate-spin mx-auto mb-10 shadow-[0_0_50px_rgba(225,29,72,0.4)]"></div>
                              <p className="text-xl font-black uppercase text-white tracking-[1em] animate-wine-pulse">GERANDO...</p>
                           </div>
                        ) : result ? (
                           <>
                              {genMode === 'Edit' && selectedImage ? (
                                <BeforeAfterSlider before={selectedImage} after={result.versions[0].imageUrl} />
                              ) : (
                                <img src={result.versions[0].imageUrl} className="w-full h-full object-cover animate-in zoom-in-95 duration-1000 shadow-2xl" />
                              )}
                              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-6 z-50">
                                 <button onClick={() => downloadAsset(result.versions[0].imageUrl, result.id)} className="px-12 py-6 bg-white text-black text-sm font-black uppercase tracking-widest rounded-3xl shadow-2xl active:scale-95 transition-all">SALVAR PNG</button>
                                 <button onClick={() => setFullscreenImage(result.versions[0].imageUrl)} className="p-6 bg-black/70 backdrop-blur-3xl rounded-3xl border-2 border-white/20 text-white hover:bg-white hover:text-black transition-all">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                 </button>
                              </div>
                           </>
                        ) : (
                           <div className="text-center opacity-10 p-16">
                              <p className="text-xl font-black uppercase tracking-[1.5em]">ESTÁGIO_DE_ESPERA</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" accept="image/*" />
        <input type="file" ref={cameraInputRef} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" accept="image/*" capture="environment" />
      </div>

      {fullscreenImage && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 md:p-20 animate-in fade-in duration-500 backdrop-blur-3xl">
          <div className="absolute inset-0 bg-black/98" onClick={() => setFullscreenImage(null)}></div>
          <img src={fullscreenImage} className="relative max-w-full max-h-full object-contain rounded-[4rem] shadow-2xl border-2 border-white/10" />
          <button onClick={() => setFullscreenImage(null)} className="absolute top-12 right-12 p-8 bg-white/10 hover:bg-[#e11d48] text-white rounded-full border-2 border-white/20 active:scale-90 transition-all">
             <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      )}
    </Layout>
  );
};

export default App;
