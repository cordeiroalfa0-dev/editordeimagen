
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
  }, []);

  const refreshData = async () => {
    const [p, f] = await Promise.all([getAllProjects(), getAllFolders()]);
    setProjects(p);
    setFolders(f);
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
    link.download = `V-OS-${id.slice(-4)}.png`;
    link.click();
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

    // MANDATORY: Check for API key selection when using Pro models as per Google GenAI guidelines
    if (modelMode === 'Pro') {
      try {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) {
          setStatusMsg({ text: "CHAVE REQUERIDA", type: 'warning' });
          if ((window as any).aistudio?.openSelectKey) {
            await (window as any).aistudio.openSelectKey();
          }
        }
      } catch (err) {
        console.error("Erro ao verificar chave API:", err);
      }
    }

    setIsProcessing(true);
    setStatusMsg({ text: "PROCESSANDO...", type: 'info' });
    
    try {
      const data = await processImageRequest(
        genMode === 'Edit' ? selectedImage : null, 
        command, 
        modelMode, 
        aspectRatio, 
        imageSize
      );
      
      // Fixed: Property 'error' now exists on type 'ProcessingResult' via types.ts update
      if (data.error) {
        setStatusMsg({ text: data.error, type: 'error' });
      } else {
        const updated = { ...data, folderId: activeFolderId } as ProcessingResult;
        await saveProject(updated);
        setResult(updated);
        refreshData();
        setStatusMsg({ text: "CONCLUÍDO", type: 'success' });
      }
    } catch (e) {
      setStatusMsg({ text: "ERRO DE REDE", type: 'error' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMsg(null), 2000);
    }
  };

  // Performance: Renderiza lista de arquivos apenas quando necessário
  const projectGrid = useMemo(() => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 animate-in fade-in duration-200">
      {projects.map(p => (
        <div key={p.id} onClick={() => { setResult(p); setViewMode(ViewMode.COMPARISON); }} className="aspect-square bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 cursor-pointer active:scale-95 transition-transform">
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
      onClearHistory={async () => { if(confirm("Limpar tudo?")) { await clearAllProjects(); refreshData(); setResult(null); } }}
      onGeneratePython={() => {}}
      onCreateFolder={async n => { if(n) await saveFolder({id: `F-${Date.now()}`, name: n, timestamp: Date.now()}); refreshData(); }}
      onSelectFolder={setActiveFolderId}
      onDeleteFolder={async id => { await deleteFolder(id); refreshData(); }}
      onMoveProject={updateProjectFolder}
    >
      <div className="max-w-[1100px] mx-auto px-4 py-4 md:py-8 space-y-6">
        
        {/* TABS RÁPIDAS */}
        <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5">
          <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`flex-1 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-white text-black' : 'text-zinc-500'}`}>ESTÚDIO</button>
          <button onClick={() => setViewMode(ViewMode.HISTORY)} className={`flex-1 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.HISTORY ? 'bg-white text-black' : 'text-zinc-500'}`}>ARQUIVOS</button>
        </div>

        {statusMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest shadow-2xl animate-in slide-in-from-top-4 duration-200">
            {statusMsg.text}
          </div>
        )}

        {viewMode === ViewMode.HISTORY ? projectGrid : (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
            
            {/* CONTROLES */}
            <div className="w-full lg:col-span-5 space-y-4">
              <div className="glass-panel p-5 md:p-8 rounded-[2rem] space-y-6">
                <div className="flex gap-2 p-1 bg-black/40 rounded-xl">
                  <button onClick={() => setGenMode('Edit')} className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase ${genMode === 'Edit' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>EDITAR</button>
                  <button onClick={() => setGenMode('Create')} className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase ${genMode === 'Create' ? 'bg-[#e11d48] text-white' : 'text-zinc-600'}`}>CRIAR</button>
                </div>

                <textarea 
                  value={command} onChange={e => setCommand(e.target.value)}
                  className="w-full bg-black/50 p-5 rounded-2xl text-sm outline-none border border-white/5 focus:border-[#e11d48]/40 min-h-[100px] md:min-h-[150px] text-white"
                  placeholder="Comando técnico..."
                />

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setModelMode('Standard')} className={`py-3 rounded-xl text-[9px] font-black border transition-all ${modelMode === 'Standard' ? 'bg-white text-black' : 'border-white/5 text-zinc-600'}`}>FLASH (VELOZ)</button>
                  <button onClick={() => setModelMode('Pro')} className={`py-3 rounded-xl text-[9px] font-black border transition-all ${modelMode === 'Pro' ? 'bg-[#e11d48] text-white border-[#e11d48]' : 'border-white/5 text-zinc-600'}`}>ULTRA PRO</button>
                </div>

                <button 
                  onClick={handleRun} disabled={isProcessing}
                  className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isProcessing ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black active:scale-95'}`}
                >
                  {isProcessing ? 'EXECUTANDO...' : 'RENDERIZAR'}
                </button>
              </div>
            </div>

            {/* VISUALIZAÇÃO */}
            <div className="w-full lg:col-span-7 space-y-6">
              <div className="aspect-square bg-zinc-950 rounded-[2rem] border border-white/5 relative overflow-hidden shadow-inner">
                {isProcessing ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
                    <div className="w-10 h-10 border-4 border-[#e11d48] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : null}
                
                {result ? (
                  <div className="w-full h-full animate-in fade-in duration-300">
                    {genMode === 'Edit' && selectedImage ? (
                      <BeforeAfterSlider before={selectedImage} after={result.versions[0].imageUrl} />
                    ) : (
                      <img src={result.versions[0].imageUrl} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center gap-3">
                      <button onClick={() => downloadAsset(result.versions[0].imageUrl, result.id)} className="flex-1 py-4 bg-white text-black text-[10px] font-black uppercase rounded-xl">SALVAR</button>
                      <button onClick={() => setFullscreenImage(result.versions[0].imageUrl)} className="p-4 bg-black/60 rounded-xl border border-white/10"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => genMode === 'Edit' && fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    {selectedImage && genMode === 'Edit' ? (
                      <img src={selectedImage} className="w-full h-full object-cover opacity-40" />
                    ) : (
                      <div className="text-center opacity-20 group">
                        <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">CARREGAR SOURCE</p>
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 animate-in fade-in duration-200">
          <img src={fullscreenImage} className="max-w-full max-h-full object-contain rounded-xl" onClick={() => setFullscreenImage(null)} />
          <button onClick={() => setFullscreenImage(null)} className="absolute top-6 right-6 p-4 bg-white/10 rounded-full text-white">✕</button>
        </div>
      )}
    </Layout>
  );
};

export default App;
