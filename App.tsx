
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
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'info' | 'success' } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GALLERY);
  
  // Dual Engine Settings
  const [modelMode, setModelMode] = useState<ModelMode>('Standard');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    const p = await getAllProjects();
    const f = await getAllFolders();
    setProjects(p);
    setFolders(f);
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setStatusMsg(null);
    }
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRun = async () => {
    if (!selectedImage || isProcessing) return;

    // Se estiver no modo Pro, verificar se o usuário selecionou uma chave
    if (modelMode === 'Pro') {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setStatusMsg({ text: "MODO PRO EXIGE CHAVE PAGA: Abra o seletor de chaves.", type: 'warning' });
          await aistudio.openSelectKey();
          // Prossegue após abrir o diálogo (race condition mitigation)
        }
      }
    }
    
    setIsProcessing(true);
    setStatusMsg(null);
    
    try {
      const data = await processImageRequest(selectedImage, command, modelMode, aspectRatio, imageSize);
      const dataWithFolder = { ...data, folderId: activeFolderId };
      
      await saveProject(dataWithFolder);
      setResult(dataWithFolder);
      await refreshData();
      
      setStatusMsg({ text: `RENDER ${modelMode} CONCLUÍDO`, type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
      
    } catch (e: any) {
      if (e.message?.includes("KEY_ERROR")) {
        handleSelectKey();
      }
      setStatusMsg({ text: e.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateFolder = async (name: string) => {
    const newFolder: Folder = {
      id: `DIR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name,
      timestamp: Date.now()
    };
    await saveFolder(newFolder);
    await refreshData();
    setActiveFolderId(newFolder.id);
  };

  return (
    <Layout 
      projects={projects} 
      folders={folders}
      activeProjectId={result?.id} 
      activeFolderId={activeFolderId}
      onSelectProject={p => { 
        setResult(p); 
        setSelectedImage(p.originalAlignedUrl || null);
        if (p.config) {
          setModelMode(p.config.mode);
          setAspectRatio(p.config.aspectRatio);
          setImageSize(p.config.imageSize);
        }
      }}
      onDeleteProject={async id => { await deleteProject(id); refreshData(); setResult(null); }}
      onClearHistory={async () => { await clearAllProjects(); refreshData(); setResult(null); }}
      onGeneratePython={() => {}}
      onCreateFolder={handleCreateFolder}
      onSelectFolder={setActiveFolderId}
      onDeleteFolder={async id => { await deleteFolder(id); refreshData(); if(activeFolderId === id) setActiveFolderId(undefined); }}
      onMoveProject={updateProjectFolder}
    >
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12 animate-in fade-in duration-700">
        
        {statusMsg && (
          <div className={`p-6 rounded-3xl text-center shadow-2xl backdrop-blur-xl border transition-all flex items-center justify-between ${
            statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
            statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
            'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] flex-1">{statusMsg.text}</p>
            {statusMsg.type === 'warning' && (
              <button onClick={handleSelectKey} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-[9px] font-black uppercase">Configurar Chave</button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* PAINEL DE COMANDO */}
          <div className="space-y-8 sticky top-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.5em]">Workstation Input</span>
                <div className="flex items-center gap-2 bg-zinc-900/80 p-1 rounded-full border border-white/5">
                  <button 
                    onClick={() => setModelMode('Standard')}
                    className={`px-4 py-1.5 rounded-full text-[8px] font-black transition-all ${modelMode === 'Standard' ? 'bg-indigo-500 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    STANDARD
                  </button>
                  <button 
                    onClick={() => setModelMode('Pro')}
                    className={`px-4 py-1.5 rounded-full text-[8px] font-black transition-all ${modelMode === 'Pro' ? 'bg-emerald-500 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    PRO (4K)
                  </button>
                </div>
              </div>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-square bg-[#0a0a0a] rounded-[3.5rem] border flex items-center justify-center overflow-hidden cursor-pointer shadow-2xl relative group transition-all duration-500 ${modelMode === 'Pro' ? 'border-emerald-500/20' : 'border-white/5'}`}
              >
                {selectedImage ? (
                  <img src={selectedImage} alt="Mesh base" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="text-center space-y-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all ${modelMode === 'Pro' ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                      <svg className={`w-8 h-8 ${modelMode === 'Pro' ? 'text-emerald-500' : 'text-zinc-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <span className="block text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700">Carregar Imagem</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" accept="image/*" />
              </div>
            </div>

            {/* CONTROLES TÉCNICOS */}
            <div className={`p-8 rounded-[3rem] border shadow-2xl space-y-8 transition-colors duration-500 ${modelMode === 'Pro' ? 'bg-emerald-950/10 border-emerald-500/10' : 'bg-[#080808] border-white/5'}`}>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-2">Formato</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["1:1", "16:9", "9:16", "4:3"] as AspectRatio[]).map(r => (
                      <button 
                        key={r}
                        onClick={() => setAspectRatio(r)}
                        className={`py-2.5 rounded-xl text-[9px] font-black transition-all border ${aspectRatio === r ? (modelMode === 'Pro' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white') : 'bg-black/40 border-white/5 text-zinc-600'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-2">Qualidade Render</label>
                  <div className="grid grid-cols-1 gap-2">
                    {modelMode === 'Standard' ? (
                      <div className="py-2.5 px-4 bg-zinc-900 border border-white/5 rounded-xl text-[9px] font-black text-zinc-600 text-center">
                        MODO FLASH (1K)
                      </div>
                    ) : (
                      (["1K", "2K", "4K"] as ImageSize[]).map(s => (
                        <button 
                          key={s}
                          onClick={() => setImageSize(s)}
                          className={`py-2.5 rounded-xl text-[9px] font-black transition-all border ${imageSize === s ? 'bg-emerald-600 text-white shadow-lg' : 'bg-black/40 border-white/5 text-zinc-600'}`}
                        >
                          {s} {s === "4K" && " ULTRA HD"}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <textarea 
                value={command}
                onChange={e => setCommand(e.target.value)}
                className="w-full bg-black border border-white/5 rounded-[2rem] p-8 text-sm outline-none focus:border-indigo-500/30 min-h-[140px] resize-none transition-all placeholder:text-zinc-800"
                placeholder="PROMPT: Descreva o que deseja mudar (ex: 'troque a cor da roupa', 'mude o fundo')..."
              />

              <button 
                onClick={handleRun}
                disabled={isProcessing || !selectedImage}
                className={`w-full py-7 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.6em] transition-all shadow-2xl flex items-center justify-center gap-4 ${
                  isProcessing ? 'bg-zinc-800 text-zinc-600' : 
                  (modelMode === 'Pro' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-white text-black hover:bg-indigo-600 hover:text-white')
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className={`w-5 h-5 border-2 border-zinc-700 rounded-full animate-spin ${modelMode === 'Pro' ? 'border-t-emerald-300' : 'border-t-indigo-500'}`}></div>
                    RENDERIZANDO...
                  </>
                ) : `EXECUTAR ${modelMode.toUpperCase()}`}
              </button>
            </div>
          </div>

          {/* PAINEL DE RESULTADO */}
          <div className="space-y-8">
            {isProcessing ? (
              <div className="aspect-square bg-[#050505] rounded-[3.5rem] border border-white/5 flex flex-col items-center justify-center space-y-10">
                <div className="relative">
                  <div className={`w-32 h-32 border rounded-full animate-ping absolute inset-0 ${modelMode === 'Pro' ? 'border-emerald-500/10' : 'border-indigo-500/10'}`}></div>
                  <div className={`w-32 h-32 border-2 border-zinc-900 rounded-full animate-spin ${modelMode === 'Pro' ? 'border-t-emerald-500' : 'border-t-indigo-500'}`}></div>
                </div>
                <div className="text-center space-y-4">
                  <p className={`text-[12px] font-black uppercase tracking-[1em] animate-pulse ${modelMode === 'Pro' ? 'text-emerald-500' : 'text-indigo-500'}`}>Processando Pixels</p>
                  <p className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">Engine: {modelMode} | Output: {modelMode === 'Pro' ? imageSize : '1K'}</p>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4">
                  <div className="flex bg-[#0a0a0a] p-1.5 rounded-2xl border border-white/5">
                    <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.GALLERY ? 'bg-indigo-600 text-white' : 'text-zinc-600 hover:text-white'}`}>Resultado</button>
                    <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-indigo-600 text-white' : 'text-zinc-600 hover:text-white'}`}>Comparar</button>
                  </div>
                </div>
                
                <div className="rounded-[3.5rem] overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl group relative">
                  {viewMode === ViewMode.GALLERY ? (
                    <img src={result.versions[0]?.imageUrl} alt="Final Asset" className="w-full h-full object-cover" />
                  ) : (
                    <BeforeAfterSlider before={result.originalAlignedUrl || ''} after={result.versions[0]?.imageUrl || ''} />
                  )}
                  
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-md p-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end gap-8">
                    <div className="space-y-4 text-center md:text-left">
                      <div className="flex items-center gap-4 justify-center md:justify-start">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${result.config?.mode === 'Pro' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>{result.config?.mode} Engine</span>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{result.config?.imageSize} HD</span>
                      </div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase leading-relaxed max-w-md">Renderização persistida no banco de dados local. Liberdade de manipulação total no modo Pro.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = result.versions[0]?.imageUrl;
                        link.download = `VFX_${result.config?.mode}_${result.id}.png`;
                        link.click();
                      }}
                      className={`w-full py-5 font-black text-[11px] uppercase rounded-2xl hover:scale-105 transition-all ${result.config?.mode === 'Pro' ? 'bg-emerald-500 text-white' : 'bg-white text-black'}`}
                    >
                      Baixar Ativo Final
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-square border border-dashed border-white/5 rounded-[3.5rem] flex flex-col items-center justify-center opacity-20 bg-[#050505]">
                 <svg className="w-24 h-24 mb-6 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                 <p className="text-[13px] font-black uppercase tracking-[1em] text-zinc-600">Idle Stream</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
