
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
  const [error, setError] = useState<{msg: string, code: 'API' | 'SAFETY' | 'OTHER'} | null>(null);
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

  const ensureApiKey = async () => {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
      return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedImage || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      await ensureApiKey();
      const data = await processImageRequest(selectedImage, command, 2, isProMode);
      await saveProject(data);
      setResult(data);
      setProjects(await getAllProjects());
      setViewMode(ViewMode.GALLERY);
    } catch (err: any) {
      if (err.message === "API_KEY_ERROR") setError({ msg: "CHAVE DE API INVÁLIDA: Por favor, reconecte.", code: 'API' });
      else if (err.message.includes("SISTEMA PROTEGIDO")) setError({ msg: "FILTRO DE IA ATIVADO: Tente um comando sem referências a pessoas.", code: 'SAFETY' });
      else setError({ msg: "ERRO DE RENDERIZAÇÃO: Tente um comando mais simples.", code: 'OTHER' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isInitializing) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
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
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        
        {/* Painel de Diagnóstico (Erro) */}
        {error && (
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${error.code === 'API' ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`}></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{error.msg}</p>
            </div>
            <div className="flex gap-4">
               {error.code === 'API' && (
                 <button onClick={() => (window as any).aistudio.openSelectKey()} className="px-6 py-2 bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase">Reconectar</button>
               )}
               <button onClick={() => setError(null)} className="px-6 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-[9px] font-black uppercase">Ignorar</button>
            </div>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic">VisionMaster <span className="text-indigo-500">Studio</span></h1>
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-2">Bypass Enabled • Logic v5.1</p>
          </div>
          <div className="flex p-1 bg-zinc-900 rounded-xl border border-white/5">
             <button onClick={() => setIsProMode(false)} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${!isProMode ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600'}`}>Standard</button>
             <button onClick={() => setIsProMode(true)} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${isProMode ? 'bg-indigo-500 text-white' : 'text-zinc-600'}`}>Studio Pro</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="bg-zinc-900/40 rounded-[2.5rem] p-8 border border-white/5 space-y-8 backdrop-blur-3xl">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-[2rem] border border-white/5 overflow-hidden relative cursor-pointer group"
              >
                {selectedImage ? (
                  <img src={selectedImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-30">Import Image</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} className="hidden" />
              </div>

              <div className="space-y-4">
                <textarea 
                  value={command} 
                  onChange={(e) => setCommand(e.target.value)} 
                  className="w-full bg-black/60 border border-white/5 rounded-2xl p-6 text-sm text-zinc-400 min-h-[120px] focus:border-indigo-500/30 transition-all outline-none" 
                  placeholder="Instrução do Designer..."
                />
                <button 
                  onClick={handleSubmit} 
                  disabled={isProcessing || !selectedImage}
                  className={`w-full py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] transition-all shadow-2xl ${isProcessing ? 'bg-zinc-800 text-zinc-700' : 'bg-white text-black hover:bg-indigo-500 hover:text-white active:scale-95'}`}
                >
                  {isProcessing ? 'Sincronizando...' : 'Iniciar Render'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {isProcessing ? (
              <div className="aspect-square bg-zinc-900/10 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-6 text-[9px] font-black uppercase tracking-[0.5em] text-indigo-500 animate-pulse">Calculating Physics</p>
              </div>
            ) : result ? (
              <div className="space-y-8 animate-in fade-in duration-1000">
                <div className="flex gap-2">
                  <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${viewMode === ViewMode.GALLERY ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Gallery</button>
                  <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${viewMode === ViewMode.COMPARISON ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Comparison</button>
                </div>

                {viewMode === ViewMode.GALLERY ? (
                  <div className="space-y-8">
                    {result.versions.map((v) => (
                      <div key={v.id} className="rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                        <img src={v.imageUrl} className="w-full object-cover" />
                        <div className="p-6 bg-zinc-900/50 flex justify-between items-center">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Render ID: {v.id}</span>
                          <button onClick={() => window.open(v.imageUrl)} className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Download</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[2.5rem] overflow-hidden border border-white/5 bg-zinc-900/30 p-4 space-y-4">
                    <BeforeAfterSlider before={result.originalAlignedUrl || ''} after={result.versions[activeCompareIdx]?.imageUrl || ''} />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[400px] border border-dashed border-white/5 rounded-[2.5rem] flex items-center justify-center opacity-10">
                <span className="text-[9px] font-black uppercase tracking-[0.4em]">Awaiting Asset Input</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
