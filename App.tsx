
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
  const [error, setError] = useState<{message: string, type: 'quota' | 'safety' | 'general'} | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GALLERY);
  const [isProMode, setIsProMode] = useState(false);
  const [activeCompareIdx, setActiveCompareIdx] = useState(0);
  const [cooldown, setCooldown] = useState(0);

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

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const applyStyleTemplate = (template: string) => {
    const templates: Record<string, string> = {
      vogue: "High-end editorial composition, fashion studio lighting.",
      movie: "Cinematic film still, high dynamic range, artistic mood.",
      noir: "Dramatic black and white, high contrast shadows, classic aesthetic."
    };
    setCommand(templates[template] || "");
  };

  const handleSubmit = async () => {
    if (!selectedImage || isProcessing || cooldown > 0) return;

    if (isProMode) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) await (window as any).aistudio.openSelectKey();
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      const data = await processImageRequest(selectedImage, command, 2, isProMode);
      await saveProject(data);
      setResult(data);
      setActiveCompareIdx(0);
      setProjects(await getAllProjects());
      setViewMode(ViewMode.GALLERY);
    } catch (err: any) {
      let type: 'quota' | 'safety' | 'general' = 'general';
      
      if (err.message.includes("LIMITE")) {
        type = 'quota';
        setCooldown(10); // Apenas 10 segundos de espera agora!
      }
      if (err.message.includes("SISTEMA PROTEGIDO")) type = 'safety';
      
      setError({ message: err.message, type });
      setTimeout(() => setError(null), 6000);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-[#020202] flex items-center justify-center">
        <div className="w-12 h-12 bg-indigo-500 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <Layout 
      projects={projects} 
      activeProjectId={result?.id} 
      onSelectProject={p => { 
        setResult(p); 
        setSelectedImage(p.originalAlignedUrl || null); 
        setActiveCompareIdx(0);
      }}
      onDeleteProject={async (id) => { await deleteProject(id); setProjects(await getAllProjects()); }}
      onClearHistory={async () => { await clearAllProjects(); setProjects([]); }}
      onExportLibrary={() => {}}
      onGeneratePython={() => {}}
    >
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20 space-y-16 relative">
        
        {error && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 bg-zinc-900 border border-white/10 text-white rounded-[2rem] shadow-2xl backdrop-blur-xl flex items-center gap-4 animate-in slide-in-from-top-10">
            <div className={`w-2 h-2 rounded-full ${error.type === 'safety' ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`}></div>
            <p className="text-[11px] font-black uppercase tracking-widest">{error.message}</p>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div>
            <h1 className="text-6xl font-black tracking-tighter text-white italic">Vision<span className="text-indigo-500">Master</span></h1>
            <div className="flex items-center gap-4 mt-4">
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-[0.3em]">Sistema Livre</span>
              </div>
            </div>
          </div>
          <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-xl">
             <button onClick={() => setIsProMode(false)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!isProMode ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Flash</button>
             <button onClick={() => setIsProMode(true)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${isProMode ? 'bg-indigo-500 text-white' : 'text-zinc-600'}`}>Pro</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-5 space-y-10">
            <div className="glass-panel rounded-[3.5rem] p-8 premium-border shadow-2xl space-y-8 relative overflow-hidden">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-[2.5rem] border-2 border-dashed border-white/5 overflow-hidden relative group cursor-pointer bg-black/40 hover:bg-black/60 transition-all"
              >
                {selectedImage ? (
                  <img src={selectedImage} className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                    <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v16m8-8H4"/></svg>
                    <span className="text-[9px] font-black uppercase tracking-widest">Adicionar Imagem</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} className="hidden" accept="image/*" />
              </div>

              <div className="space-y-4">
                <textarea 
                  value={command} 
                  onChange={(e) => setCommand(e.target.value)} 
                  className="w-full bg-black/30 border border-white/5 rounded-[2.5rem] p-8 text-sm text-zinc-300 min-h-[160px] outline-none focus:border-indigo-500/30 transition-all placeholder:opacity-20" 
                  placeholder="Comando de edição..."
                />
                
                <div className="flex gap-2">
                  <button onClick={() => applyStyleTemplate('vogue')} className="px-4 py-2 rounded-full border border-white/5 text-[8px] font-black uppercase tracking-widest hover:bg-white/5"># Vogue</button>
                  <button onClick={() => applyStyleTemplate('movie')} className="px-4 py-2 rounded-full border border-white/5 text-[8px] font-black uppercase tracking-widest hover:bg-white/5"># Movie</button>
                </div>

                <button 
                  onClick={handleSubmit} 
                  disabled={isProcessing || !selectedImage || cooldown > 0}
                  className={`w-full py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-xl ${isProcessing || cooldown > 0 ? 'bg-zinc-900 text-zinc-700' : 'bg-white text-black hover:bg-indigo-50 active:scale-95'}`}
                >
                  {isProcessing ? 'Processando' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Renderizar Agora'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {isProcessing ? (
              <div className="aspect-square glass-panel rounded-[4rem] flex flex-col items-center justify-center premium-border">
                <div className="w-16 h-16 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
                <p className="mt-8 text-[11px] font-black uppercase tracking-[0.8em] text-indigo-500 animate-pulse">Gerando Ativos</p>
              </div>
            ) : result ? (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="flex gap-2 p-1.5 bg-zinc-900/30 rounded-2xl w-fit border border-white/5 backdrop-blur-md">
                  <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${viewMode === ViewMode.GALLERY ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Grade</button>
                  <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Comparar</button>
                </div>

                {viewMode === ViewMode.GALLERY ? (
                  <div className="grid grid-cols-1 gap-12">
                    {result.versions.map((v, i) => (
                      <div key={v.id} className="group relative glass-panel rounded-[3.5rem] overflow-hidden premium-border shadow-2xl">
                        <img src={v.imageUrl} className="w-full aspect-[4/5] object-cover" alt="Resultado" />
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-10 text-center gap-6">
                           <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Variante {i+1}</p>
                           <button onClick={() => window.open(v.imageUrl)} className="px-10 py-4 bg-white text-black text-[10px] font-black uppercase rounded-full hover:scale-105 transition-all">Baixar Imagem</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[4rem] overflow-hidden premium-border glass-panel p-8 shadow-2xl">
                    <BeforeAfterSlider before={result.originalAlignedUrl || ''} after={result.versions[activeCompareIdx]?.imageUrl || ''} />
                    <div className="flex gap-4 mt-8 overflow-x-auto pb-2">
                       {result.versions.map((v, idx) => (
                         <button key={v.id} onClick={() => setActiveCompareIdx(idx)} className={`w-24 h-24 rounded-3xl border-2 transition-all overflow-hidden shrink-0 ${activeCompareIdx === idx ? 'border-indigo-500 scale-105' : 'border-white/5 opacity-40'}`}>
                            <img src={v.imageUrl} className="w-full h-full object-cover" />
                         </button>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[500px] border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center opacity-10">
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">Pronto para Renderizar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
