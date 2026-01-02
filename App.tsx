
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

  const applySafeStyle = (style: string) => {
    const safePrompts: Record<string, string> = {
      vogue: "Iluminação editorial de alta moda, sombras dramáticas, cores vibrantes estilo revista.",
      movie: "Estilo cinematográfico HDR, atmosfera de fim de tarde, foco nítido no cenário.",
      noir: "Estético clássico em preto e branco, alto contraste, luz volumétrica."
    };
    setCommand(safePrompts[style] || "");
    setError(null);
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
      
      if (err.message.includes("SISTEMA OCUPADO")) {
        type = 'quota';
        setCooldown(15);
      }
      if (err.message.includes("RESTRIÇÃO DE IA")) {
        type = 'safety';
      }
      
      setError({ message: err.message, type });
      // Remove o erro automaticamente após 8 segundos
      setTimeout(() => setError(null), 8000);
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
        
        {/* Notificações Elegantes em vez de Banner Vermelho */}
        {error && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 animate-in slide-in-from-top-10 duration-500">
            <div className={`glass-panel p-6 rounded-[2.5rem] border shadow-2xl flex items-start gap-4 ${
              error.type === 'safety' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'
            }`}>
              <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${error.type === 'safety' ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`}></div>
              <div className="flex-1 space-y-3">
                <p className="text-[12px] font-bold leading-relaxed text-zinc-200">{error.message}</p>
                {error.type === 'safety' && (
                  <div className="flex gap-2">
                    <button onClick={() => applySafeStyle('vogue')} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest transition-all">Tentar Estilo Seguro</button>
                  </div>
                )}
              </div>
              <button onClick={() => setError(null)} className="text-zinc-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div>
            <h1 className="text-6xl font-black tracking-tighter text-white italic">Vision<span className="text-indigo-500">Master</span></h1>
            <div className="flex items-center gap-4 mt-4">
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-[0.3em]">IA Studio Master • Online</span>
              </div>
            </div>
          </div>
          <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
             <button onClick={() => setIsProMode(false)} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isProMode ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600'}`}>Flash (Free)</button>
             <button onClick={() => setIsProMode(true)} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isProMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-600'}`}>Pro (Premium)</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-5 space-y-10">
            <div className="glass-panel rounded-[4rem] p-10 premium-border shadow-2xl space-y-10 relative overflow-hidden">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-[3rem] border-2 border-dashed border-white/5 overflow-hidden relative group cursor-pointer bg-black/40 hover:bg-black/60 transition-all"
              >
                {selectedImage ? (
                  <img src={selectedImage} className="w-full h-full object-cover transition-transform duration-[12s] group-hover:scale-110" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10">
                    <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v16m8-8H4"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Importar Ativo Visual</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} className="hidden" accept="image/*" />
              </div>

              <div className="space-y-6 relative group">
                <textarea 
                  value={command} 
                  onChange={(e) => setCommand(e.target.value)} 
                  className="w-full bg-black/40 border border-white/5 rounded-[3rem] p-10 text-sm text-zinc-300 min-h-[180px] outline-none focus:border-indigo-500/30 transition-all placeholder:text-zinc-800 leading-relaxed shadow-inner" 
                  placeholder="Instrução de Edição IA..."
                />
                
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => applySafeStyle('vogue')} className="px-4 py-2 rounded-full border border-white/5 text-[8px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"># VOGUE</button>
                  <button onClick={() => applySafeStyle('movie')} className="px-4 py-2 rounded-full border border-white/5 text-[8px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"># MOVIE</button>
                  <button onClick={() => applySafeStyle('noir')} className="px-4 py-2 rounded-full border border-white/5 text-[8px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"># NOIR</button>
                </div>

                <button 
                  onClick={handleSubmit} 
                  disabled={isProcessing || !selectedImage || cooldown > 0}
                  className={`w-full py-8 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.5em] transition-all shadow-2xl ${isProcessing || cooldown > 0 ? 'bg-zinc-900 text-zinc-700' : 'bg-white text-black hover:bg-indigo-50 active:scale-95'}`}
                >
                  {isProcessing ? 'Sincronizando...' : cooldown > 0 ? `Limitação de Cota: ${cooldown}s` : 'Iniciar Renderização'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {isProcessing ? (
              <div className="aspect-[4/5] glass-panel rounded-[5rem] flex flex-col items-center justify-center premium-border">
                <div className="relative">
                  <div className="w-20 h-20 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                  </div>
                </div>
                <p className="mt-12 text-[12px] font-black uppercase tracking-[1em] text-indigo-500 animate-pulse">Reconstruindo Ativo</p>
              </div>
            ) : result ? (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex gap-2 p-1.5 bg-zinc-900/50 rounded-2xl w-fit border border-white/5 backdrop-blur-md">
                  <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.GALLERY ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600'}`}>Grade</button>
                  <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600'}`}>Antes/Depois</button>
                </div>

                {viewMode === ViewMode.GALLERY ? (
                  <div className="grid grid-cols-1 gap-16">
                    {result.versions.map((v, i) => (
                      <div key={v.id} className="group relative glass-panel rounded-[4rem] overflow-hidden premium-border shadow-2xl hover:translate-y-[-8px] transition-all duration-700">
                        <img src={v.imageUrl} className="w-full aspect-[4/5] object-cover" alt="Resultado Final" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-12">
                           <button onClick={() => window.open(v.imageUrl)} className="w-full py-6 bg-white text-black text-[11px] font-black uppercase rounded-[2rem] hover:scale-105 active:scale-95 transition-all shadow-2xl">Exportar PNG Alta Fidelidade</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[5rem] overflow-hidden premium-border glass-panel p-10 shadow-2xl space-y-10">
                    <BeforeAfterSlider before={result.originalAlignedUrl || ''} after={result.versions[activeCompareIdx]?.imageUrl || ''} />
                    <div className="flex gap-6 overflow-x-auto pb-4 px-2">
                       {result.versions.map((v, idx) => (
                         <button key={v.id} onClick={() => setActiveCompareIdx(idx)} className={`w-32 h-32 rounded-[2.5rem] border-2 transition-all overflow-hidden shrink-0 ${activeCompareIdx === idx ? 'border-indigo-500 scale-105 shadow-2xl' : 'border-white/5 opacity-30 hover:opacity-100'}`}>
                            <img src={v.imageUrl} className="w-full h-full object-cover" />
                         </button>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[640px] border-2 border-dashed border-white/5 rounded-[5rem] flex flex-col items-center justify-center opacity-10 grayscale p-20 text-center">
                <svg className="w-24 h-24 mb-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] leading-relaxed max-w-xs mx-auto">Pronto para processamento visual avançado. Adicione uma imagem para começar o estúdio.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
