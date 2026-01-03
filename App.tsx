
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.COMPARISON);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const [modelMode, setModelMode] = useState<ModelMode>('Standard');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [genMode, setGenMode] = useState<'Edit' | 'Create'>('Edit');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
    // Handler para instalação do PWA
    const handleInstall = (e: any) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleInstall);
  }, []);

  const refreshData = async () => {
    try {
      const [p, f] = await Promise.all([getAllProjects(), getAllFolders()]);
      setProjects(p);
      setFolders(f);
    } catch (e) {
      console.error("Erro ao carregar banco local:", e);
    }
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setResult(null);
      setGenMode('Edit');
      setStatusMsg({ text: "IMAGEM PRONTA", type: 'success' });
      setTimeout(() => setStatusMsg(null), 1000);
    };
    reader.readAsDataURL(file);
  };

  const downloadAsset = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `VISION-${id.slice(-4)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRun = async () => {
    if (isProcessing) return;
    if (genMode === 'Edit' && !selectedImage) {
      setStatusMsg({ text: "INSIRA UMA IMAGEM", type: 'warning' });
      return;
    }
    if (command.trim().length < 2) {
      setStatusMsg({ text: "DESCREVA O COMANDO", type: 'warning' });
      return;
    }

    // Compatibilidade Vercel/Produção para Chave Pro
    if (modelMode === 'Pro') {
      const aiStudio = (window as any).aistudio;
      if (aiStudio && typeof aiStudio.hasSelectedApiKey === 'function') {
        try {
          const hasKey = await aiStudio.hasSelectedApiKey();
          if (!hasKey) {
            setStatusMsg({ text: "CHAVE REQUERIDA", type: 'warning' });
            await aiStudio.openSelectKey();
          }
        } catch (err) {
          console.warn("Verificação de chave ignorada em ambiente externo.");
        }
      }
    }

    setIsProcessing(true);
    setStatusMsg({ text: "GERANDO RENDER...", type: 'info' });
    
    try {
      const data = await processImageRequest(
        genMode === 'Edit' ? selectedImage : null, 
        command, 
        modelMode, 
        aspectRatio, 
        imageSize
      );
      
      if (data.error) {
        setStatusMsg({ text: data.error, type: 'error' });
      } else {
        const updated = { ...data, folderId: activeFolderId } as ProcessingResult;
        await saveProject(updated);
        setResult(updated);
        refreshData();
        setStatusMsg({ text: "SUCESSO", type: 'success' });
      }
    } catch (e) {
      setStatusMsg({ text: "ERRO DE CONEXÃO", type: 'error' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const projectGrid = useMemo(() => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 animate-in fade-in duration-300">
      {projects.length === 0 ? (
        <div className="col-span-full py-20 text-center opacity-20 font-black uppercase tracking-widest">Nenhum render encontrado</div>
      ) : projects.map(p => (
        <div key={p.id} onClick={() => { setResult(p); setViewMode(ViewMode.COMPARISON); }} className="group aspect-square bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/5 cursor-pointer active:scale-95 transition-all shadow-xl">
           <img src={p.versions[0].imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
        </div>
      ))}
    </div>
  ), [projects]);

  return (
    <Layout 
      projects={projects} folders={folders} activeProjectId={result?.id} activeFolderId={activeFolderId} operatorEmail=""
      onSelectProject={(p) => { setResult(p); setViewMode(ViewMode.COMPARISON); }}
      onDeleteProject={async id => { await deleteProject(id); refreshData(); setResult(null); }}
      onClearHistory={async () => { if(confirm("Apagar histórico permanente?")) { await clearAllProjects(); refreshData(); setResult(null); } }}
      onGeneratePython={() => {}}
      onCreateFolder={async n => { if(n) await saveFolder({id: `F-${Date.now()}`, name: n, timestamp: Date.now()}); refreshData(); }}
      onSelectFolder={setActiveFolderId}
      onDeleteFolder={async id => { if(confirm("Excluir pasta?")) { await deleteFolder(id); refreshData(); } }}
      onMoveProject={updateProjectFolder}
      onInstallApp={() => {
        const prompt = (window as any).deferredPrompt;
        if (prompt) {
          prompt.prompt();
          (window as any).deferredPrompt = null;
        }
      }}
    >
      <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-12 space-y-8 pb-32">
        
        <div className="flex bg-zinc-900/80 backdrop-blur-xl p-2 rounded-3xl border border-white/5 shadow-2xl">
          <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`flex-1 py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>ESTÚDIO DE RENDER</button>
          <button onClick={() => setViewMode(ViewMode.HISTORY)} className={`flex-1 py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all ${viewMode === ViewMode.HISTORY ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>BIBLIOTECA</button>
        </div>

        {statusMsg && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[500] px-8 py-4 rounded-2xl glass-panel border-white/20 shadow-2xl animate-in slide-in-from-top-10 duration-300`}>
            <p className="text-xs md:text-sm font-black uppercase tracking-widest text-center text-white drop-shadow-md">
              {statusMsg.text}
            </p>
          </div>
        )}

        {viewMode === ViewMode.HISTORY ? projectGrid : (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-10 items-start">
            
            <div className="w-full lg:col-span-5 space-y-6">
              <div className="glass-panel p-6 md:p-10 rounded-[3rem] space-y-8 shadow-2xl border-white/10">
                <div className="flex gap-3 p-1.5 bg-black/60 rounded-2xl border border-white/5">
                  <button onClick={() => setGenMode('Edit')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${genMode === 'Edit' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>VARIAR</button>
                  <button onClick={() => setGenMode('Create')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${genMode === 'Create' ? 'bg-[#e11d48] text-white' : 'text-zinc-600'}`}>CRIAR DO ZERO</button>
                </div>

                <div className="space-y-4">
                  <label className="label-wine block px-2">COMANDO_MESTRE</label>
                  <textarea 
                    value={command} onChange={e => setCommand(e.target.value)}
                    className="w-full bg-black/60 p-6 rounded-[2rem] text-sm md:text-base outline-none border border-white/10 focus:border-[#e11d48]/50 min-h-[140px] md:min-h-[180px] text-white font-medium leading-relaxed"
                    placeholder={genMode === 'Create' ? "Ex: Uma metrópole cyberpunk em 8k..." : "Ex: Transforme em uma cena noturna com luzes neon..."}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setModelMode('Standard')} className={`py-4 rounded-2xl text-[9px] font-black border transition-all ${modelMode === 'Standard' ? 'bg-white text-black border-white' : 'border-white/5 text-zinc-600'}`}>MOTOR_VELOZ</button>
                  <button onClick={() => setModelMode('Pro')} className={`py-4 rounded-2xl text-[9px] font-black border transition-all ${modelMode === 'Pro' ? 'bg-[#e11d48] text-white border-[#e11d48]' : 'border-white/5 text-zinc-600'}`}>MOTOR_ULTRA</button>
                </div>

                <button 
                  onClick={handleRun} disabled={isProcessing}
                  className={`w-full py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.5em] transition-all shadow-2xl ${isProcessing ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' : 'bg-white text-black hover:scale-[1.02] active:scale-95'}`}
                >
                  {isProcessing ? 'PROCESSANDO...' : 'EXECUTAR RENDER'}
                </button>
              </div>
            </div>

            <div className="w-full lg:col-span-7 space-y-6">
              <div className="aspect-square bg-[#050507] rounded-[3rem] md:rounded-[4rem] border border-white/5 relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] group">
                {isProcessing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-50">
                    <div className="w-16 h-16 border-[6px] border-[#e11d48] border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="text-[10px] font-black uppercase tracking-[1em] text-white animate-pulse">SINTETIZANDO_PIXELS</p>
                  </div>
                )}
                
                {result ? (
                  <div className="w-full h-full animate-in fade-in duration-500">
                    {genMode === 'Edit' && selectedImage ? (
                      <BeforeAfterSlider before={selectedImage} after={result.versions[0].imageUrl} />
                    ) : (
                      <img src={result.versions[0].imageUrl} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute bottom-8 left-0 right-0 px-8 flex justify-center gap-4 z-[60]">
                      <button onClick={() => downloadAsset(result.versions[0].imageUrl, result.id)} className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-zinc-200 transition-colors">EXPORTAR PNG</button>
                      <button onClick={() => setFullscreenImage(result.versions[0].imageUrl)} className="p-5 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 text-white hover:bg-white/10 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => genMode === 'Edit' && fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer group hover:bg-white/[0.01] transition-all"
                  >
                    {selectedImage && genMode === 'Edit' ? (
                      <div className="relative w-full h-full">
                        <img src={selectedImage} className="w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 transition-all duration-700" />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">IMAGEM CARREGADA_AGUARDANDO COMANDO</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center opacity-10 group-hover:opacity-30 transition-opacity">
                        <svg className="w-20 h-20 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <p className="text-xs font-black uppercase tracking-[1em]">ADICIONAR_FONTE</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" accept="image/*" />
      </div>

      {fullscreenImage && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/98 animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setFullscreenImage(null)}></div>
          <img src={fullscreenImage} className="relative max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/5" />
          <button onClick={() => setFullscreenImage(null)} className="absolute top-8 right-8 p-5 bg-white/10 rounded-full text-white border border-white/10 backdrop-blur-md">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      )}
    </Layout>
  );
};

export default App;
