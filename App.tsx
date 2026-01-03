
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
      setStatusMsg({ text: "IMAGEM CARREGADA", type: 'success' });
      setTimeout(() => setStatusMsg(null), 1000);
    };
    reader.readAsDataURL(file);
  };

  const downloadAsset = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `V-OS-${id.slice(-4)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRun = async () => {
    if (isProcessing) return;
    if (genMode === 'Edit' && !selectedImage) {
      setStatusMsg({ text: "ADICIONE UMA IMAGEM", type: 'warning' });
      return;
    }
    if (command.trim().length < 2) {
      setStatusMsg({ text: "DIGITE UM COMANDO", type: 'warning' });
      return;
    }

    // MANDATORY: API Key selection logic for Gemini 3 / Vercel compatibility
    if (modelMode === 'Pro') {
      const aiStudio = (window as any).aistudio;
      if (aiStudio && typeof aiStudio.hasSelectedApiKey === 'function') {
        const hasKey = await aiStudio.hasSelectedApiKey();
        if (!hasKey) {
          setStatusMsg({ text: "CHAVE EXIGIDA PARA MODO ULTRA", type: 'warning' });
          await aiStudio.openSelectKey();
          // Procedemos após o trigger, pois a chave é injetada automaticamente
        }
      }
    }

    setIsProcessing(true);
    setStatusMsg({ text: "INICIANDO RENDER...", type: 'info' });
    
    try {
      const data = await processImageRequest(
        genMode === 'Edit' ? selectedImage : null, 
        command, 
        modelMode, 
        aspectRatio, 
        imageSize
      );
      
      if (data.error) {
        // Se o erro for de entidade não encontrada (falta de chave paga), resetamos e pedimos chave
        if (data.error.includes("Requested entity was not found")) {
           const aiStudio = (window as any).aistudio;
           if (aiStudio?.openSelectKey) {
              await aiStudio.openSelectKey();
              setStatusMsg({ text: "VINCULE UM PROJETO PAGO E TENTE NOVAMENTE", type: 'error' });
           }
        } else {
           setStatusMsg({ text: data.error, type: 'error' });
        }
      } else {
        const updated = { ...data, folderId: activeFolderId } as ProcessingResult;
        await saveProject(updated);
        setResult(updated);
        refreshData();
        setStatusMsg({ text: "CONCLUÍDO", type: 'success' });
      }
    } catch (e) {
      setStatusMsg({ text: "ERRO DE SERVIDOR", type: 'error' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const projectGrid = useMemo(() => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
      {projects.map(p => (
        <div key={p.id} onClick={() => { setResult(p); setViewMode(ViewMode.COMPARISON); }} className="aspect-square bg-zinc-900 rounded-[1.5rem] overflow-hidden border border-white/5 cursor-pointer active:scale-95 transition-all shadow-lg hover:border-white/20">
           <img src={p.versions[0].imageUrl} className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
    </div>
  ), [projects]);

  return (
    <Layout 
      projects={projects} folders={folders} activeProjectId={result?.id} activeFolderId={activeFolderId} operatorEmail=""
      onSelectProject={(p) => { setResult(p); setViewMode(ViewMode.COMPARISON); }}
      onDeleteProject={async id => { await deleteProject(id); refreshData(); setResult(null); }}
      onClearHistory={async () => { if(confirm("Limpar biblioteca?")) { await clearAllProjects(); refreshData(); setResult(null); } }}
      onGeneratePython={() => {}}
      onCreateFolder={async n => { if(n) await saveFolder({id: `F-${Date.now()}`, name: n, timestamp: Date.now()}); refreshData(); }}
      onSelectFolder={setActiveFolderId}
      onDeleteFolder={async id => { if(confirm("Apagar pasta?")) { await deleteFolder(id); refreshData(); } }}
      onMoveProject={updateProjectFolder}
      onInstallApp={() => {
        const prompt = (window as any).deferredPrompt;
        if (prompt) prompt.prompt();
      }}
    >
      <div className="max-w-[1200px] mx-auto px-4 py-4 md:py-10 space-y-6 pb-40">
        
        <div className="flex bg-zinc-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5">
          <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`flex-1 py-3.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-white text-black shadow-lg' : 'text-zinc-500'}`}>ESTÚDIO</button>
          <button onClick={() => setViewMode(ViewMode.HISTORY)} className={`flex-1 py-3.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.HISTORY ? 'bg-white text-black shadow-lg' : 'text-zinc-500'}`}>BIBLIOTECA</button>
        </div>

        {statusMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] px-6 py-4 rounded-2xl glass-panel border-white/20 shadow-2xl animate-in slide-in-from-top-4 duration-300 w-[90%] max-w-sm">
            <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-center text-white">
              {statusMsg.text}
            </p>
          </div>
        )}

        {viewMode === ViewMode.HISTORY ? projectGrid : (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">
            
            <div className="w-full lg:col-span-5 space-y-4">
              <div className="glass-panel p-6 md:p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
                <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                  <button onClick={() => setGenMode('Edit')} className={`flex-1 py-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${genMode === 'Edit' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>VARIAR</button>
                  <button onClick={() => setGenMode('Create')} className={`flex-1 py-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${genMode === 'Create' ? 'bg-[#e11d48] text-white' : 'text-zinc-500'}`}>CRIAR</button>
                </div>

                <div className="space-y-3">
                  <label className="label-wine block px-2 text-[10px]">COMANDO_TÉCNICO</label>
                  <textarea 
                    value={command} onChange={e => setCommand(e.target.value)}
                    className="w-full bg-black/60 p-5 rounded-[1.5rem] text-sm md:text-base outline-none border border-white/10 focus:border-[#e11d48]/50 min-h-[120px] md:min-h-[160px] text-white font-medium"
                    placeholder={genMode === 'Create' ? "O que deseja criar?" : "Como deseja alterar a foto?"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setModelMode('Standard')} className={`py-4 rounded-xl text-[9px] font-black border transition-all ${modelMode === 'Standard' ? 'bg-white text-black border-white' : 'border-white/5 text-zinc-600'}`}>MOTOR_VELOZ</button>
                  <button onClick={() => setModelMode('Pro')} className={`py-4 rounded-xl text-[9px] font-black border transition-all ${modelMode === 'Pro' ? 'bg-[#e11d48] text-white border-[#e11d48]' : 'border-white/5 text-zinc-600'}`}>MOTOR_ULTRA</button>
                </div>

                <button 
                  onClick={handleRun} disabled={isProcessing}
                  className={`w-full py-6 md:py-8 rounded-[2rem] font-black text-xs md:text-sm uppercase tracking-[0.4em] transition-all shadow-xl ${isProcessing ? 'bg-zinc-900 text-zinc-700' : 'bg-white text-black active:scale-95'}`}
                >
                  {isProcessing ? 'RENDERIZANDO...' : 'EXECUTAR RENDER'}
                </button>
              </div>
            </div>

            <div className="w-full lg:col-span-7 space-y-6">
              <div className="aspect-square bg-[#050507] rounded-[2.5rem] md:rounded-[4rem] border border-white/5 relative overflow-hidden shadow-2xl group">
                {isProcessing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md z-50">
                    <div className="w-12 h-12 border-4 border-[#e11d48] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.6em] text-white animate-pulse">SINTETIZANDO</p>
                  </div>
                )}
                
                {result ? (
                  <div className="w-full h-full animate-in fade-in duration-500">
                    {genMode === 'Edit' && selectedImage ? (
                      <BeforeAfterSlider before={selectedImage} after={result.versions[0].imageUrl} />
                    ) : (
                      <img src={result.versions[0].imageUrl} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center gap-3 z-[60]">
                      <button onClick={() => downloadAsset(result.versions[0].imageUrl, result.id)} className="flex-1 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl shadow-2xl hover:bg-zinc-200">SALVAR PNG</button>
                      <button onClick={() => setFullscreenImage(result.versions[0].imageUrl)} className="p-4 bg-black/80 backdrop-blur-xl rounded-xl border border-white/20 text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
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
                        <img src={selectedImage} className="w-full h-full object-cover opacity-20 grayscale transition-all duration-700" />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">FOTO SELECIONADA</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center opacity-10 group-hover:opacity-30 transition-opacity">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <p className="text-[10px] font-black uppercase tracking-[0.8em]">ADD_FONTE</p>
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
          <button onClick={() => setFullscreenImage(null)} className="absolute top-6 right-6 p-4 bg-white/10 rounded-full text-white border border-white/10 backdrop-blur-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      )}
    </Layout>
  );
};

export default App;
