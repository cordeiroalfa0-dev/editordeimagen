
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { processImageRequest } from './services/gemini';
import { ProcessingResult, ViewMode } from './types';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { saveProject, getAllProjects, deleteProject, clearAllProjects } from './services/storage';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [projects, setProjects] = useState<ProcessingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GALLERY);
  const [isProMode, setIsProMode] = useState(false);
  const [activeCompareIdx, setActiveCompareIdx] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const startApp = async () => {
      try {
        const saved = await getAllProjects();
        setProjects(saved);
        if (saved.length > 0) {
          setResult(saved[0]);
          setSelectedImage(saved[0].originalAlignedUrl || null);
        }
        setIsInitializing(false);
      } catch (err) {
        setIsInitializing(false);
      }
    };
    startApp();
  }, []);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleReconnect = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      setError(null);
    } catch (e) {}
  };

  const handleSubmit = async () => {
    if (!selectedImage || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const data = await processImageRequest(selectedImage, command, 2, isProMode);
      await saveProject(data);
      setResult(data);
      setProjects(await getAllProjects());
      setViewMode(ViewMode.GALLERY);
    } catch (err: any) {
      if (err.message === "AUTH_ERROR") setError("FALHA DE CONEXÃO: Selecione sua Chave de API novamente.");
      else if (err.message === "QUOTA") setError("LIMITE ATINGIDO: Aguarde 10 segundos.");
      else if (err.message === "IA_BLOCKED") setError("IA BLOQUEADA: Tente um comando focado em 'Luz e Cores'.");
      else setError("ERRO DO SISTEMA: Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isInitializing) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center"><div className="w-10 h-10 border-2 border-indigo-500 rounded-full animate-spin"></div></div>;
  }

  return (
    <Layout 
      projects={projects} 
      activeProjectId={result?.id} 
      onSelectProject={p => { setResult(p); setSelectedImage(p.originalAlignedUrl || null); }}
      onDeleteProject={async (id) => { await deleteProject(id); setProjects(await getAllProjects()); }}
      onClearHistory={async () => { await clearAllProjects(); setProjects([]); }}
      onExportLibrary={() => {}}
      onGeneratePython={() => {}}
    >
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        
        {/* Notificação de Erro com Botão de Ação */}
        {error && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md">
            <div className="bg-zinc-900 border border-red-500/50 p-5 rounded-3xl shadow-2xl flex flex-col gap-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                <p className="text-[11px] font-black uppercase text-red-200 tracking-widest">{error}</p>
              </div>
              {error.includes("CONEXÃO") && (
                <button onClick={handleReconnect} className="w-full py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">Reconectar Engine</button>
              )}
              <button onClick={() => setError(null)} className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest text-center">Fechar</button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter">Vision<span className="text-indigo-500">Master</span></h1>
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.5em] mt-2">Bypass Engine v4.0 • Deep Black Edition</p>
          </div>
          <div className="flex p-1 bg-zinc-900 rounded-xl">
             <button onClick={() => setIsProMode(false)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase ${!isProMode ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Flash</button>
             <button onClick={() => setIsProMode(true)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase ${isProMode ? 'bg-indigo-500 text-white' : 'text-zinc-600'}`}>Pro</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-zinc-900/50 rounded-[3rem] p-8 border border-white/5 space-y-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-[2rem] border-2 border-dashed border-white/5 overflow-hidden relative cursor-pointer bg-black/40 hover:bg-black transition-all"
              >
                {selectedImage ? (
                  <img src={selectedImage} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                    <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span className="text-[9px] font-black uppercase">Carregar Foto</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} className="hidden" />
              </div>

              <div className="space-y-4">
                <textarea 
                  value={command} 
                  onChange={(e) => setCommand(e.target.value)} 
                  className="w-full bg-black/60 border border-white/5 rounded-[1.5rem] p-6 text-sm text-zinc-300 min-h-[140px] focus:border-indigo-500/30 transition-all outline-none" 
                  placeholder="Instrução do Estúdio..."
                />
                <button 
                  onClick={handleSubmit} 
                  disabled={isProcessing || !selectedImage}
                  className={`w-full py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] transition-all ${isProcessing ? 'bg-zinc-800 text-zinc-600' : 'bg-white text-black hover:bg-indigo-500 hover:text-white active:scale-95'}`}
                >
                  {isProcessing ? 'Renderizando...' : 'Processar Ativo'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {isProcessing ? (
              <div className="aspect-square bg-zinc-900/30 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center animate-pulse">
                <div className="w-12 h-12 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
              </div>
            ) : result ? (
              <div className="space-y-8">
                <div className="flex gap-2">
                  <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.GALLERY ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Grade</button>
                  <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Slide</button>
                </div>

                {viewMode === ViewMode.GALLERY ? (
                  <div className="grid grid-cols-1 gap-8">
                    {result.versions.map((v) => (
                      <div key={v.id} className="relative rounded-[2.5rem] overflow-hidden border border-white/5 group bg-zinc-900 shadow-2xl">
                        <img src={v.imageUrl} className="w-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <button onClick={() => window.open(v.imageUrl)} className="px-8 py-3 bg-white text-black text-[9px] font-black uppercase rounded-full">Salvar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[3rem] overflow-hidden border border-white/5 bg-zinc-900 p-6 space-y-6">
                    <BeforeAfterSlider before={result.originalAlignedUrl || ''} after={result.versions[activeCompareIdx]?.imageUrl || ''} />
                    <div className="flex gap-4 overflow-x-auto pb-2">
                       {result.versions.map((v, idx) => (
                         <button key={v.id} onClick={() => setActiveCompareIdx(idx)} className={`w-20 h-20 rounded-2xl border-2 transition-all overflow-hidden shrink-0 ${activeCompareIdx === idx ? 'border-indigo-500 scale-105' : 'border-transparent opacity-40'}`}>
                            <img src={v.imageUrl} className="w-full h-full object-cover" />
                         </button>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[400px] border border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center opacity-10">
                <span className="text-[10px] font-black uppercase tracking-widest">Aguardando Input</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
