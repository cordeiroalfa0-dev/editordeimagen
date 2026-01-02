
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { processImageRequest } from './services/gemini';
import { ProcessingResult, ViewMode } from './types';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { saveProject, getAllProjects, deleteProject, clearAllProjects } from './services/storage';

const STYLES = [
  { id: 'vogue', label: 'Vogue', icon: '📸', prompt: 'Vogue fashion editorial style, luxury studio lighting' },
  { id: 'cinematic', label: 'Movie', icon: '🎬', prompt: 'Cinematic lighting, anamorphic lens, high-end production' },
  { id: 'cyber', label: 'Neon', icon: '🌆', prompt: 'Cyberpunk aesthetic, neon accents, futuristic atmosphere' },
  { id: 'noir', label: 'Noir', icon: '🌑', prompt: 'Artistic black and white, dramatic contrast' },
];

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [projects, setProjects] = useState<ProcessingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GALLERY);
  const [activeCompareIdx, setActiveCompareIdx] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const [isProMode, setIsProMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const startApp = async () => {
      try {
        const draftImg = localStorage.getItem('visionedit_draft_image');
        const draftCmd = localStorage.getItem('visionedit_draft_command');
        if (draftImg) setSelectedImage(draftImg);
        if (draftCmd) setCommand(draftCmd);

        const saved = await getAllProjects().catch(() => []);
        setProjects(saved);
        if (saved.length > 0) setResult(saved[0]);
        setTimeout(() => setIsInitializing(false), 1000);
      } catch (err) {
        setIsInitializing(false);
      }
    };
    startApp();
  }, []);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setSelectedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleOpenKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) await aistudio.openSelectKey();
  };

  const handleSubmit = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setError(null);
    try {
      const data = await processImageRequest(selectedImage, command, 3, isProMode, "1K", useGrounding);
      await saveProject(data);
      setResult(data);
      setProjects(await getAllProjects());
      setViewMode(ViewMode.GALLERY);
    } catch (err: any) {
      setError(err?.message || "Erro na geração. Tente outro comando.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-[#020202] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 bg-indigo-500 rounded-[1.5rem] mb-8 animate-pulse flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.3)]">
          <span className="font-black text-2xl italic">V</span>
        </div>
        <h2 className="text-white font-black uppercase tracking-[0.5em] text-[10px]">Studio Master</h2>
        <div className="mt-4 w-32 h-[1px] bg-white/5 relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-indigo-500 w-1/2 animate-[progress_2s_infinite]"></div>
        </div>
        <style>{`@keyframes progress { 0% { left: -100%; } 100% { left: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <Layout 
      projects={projects} 
      activeProjectId={result?.id} 
      onSelectProject={p => { setResult(p); setSelectedImage(p.originalAlignedUrl || null); setViewMode(ViewMode.GALLERY); }}
      onDeleteProject={async (id) => { await deleteProject(id); setProjects(await getAllProjects()); if (result?.id === id) setResult(null); }}
      onClearHistory={async () => { await clearAllProjects(); setProjects([]); setResult(null); }}
      onExportLibrary={() => {}}
      onGeneratePython={() => {}}
    >
      <div className="max-w-7xl mx-auto px-6 py-12 lg:px-16 lg:py-20 space-y-20">
        
        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
          <div className="space-y-6 max-w-2xl">
            <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-white italic leading-[1.1]">
              <span className="text-zinc-600">Vision</span>Master
            </h1>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
              O futuro da edição editorial impulsionado por inteligência visual multimodal.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-[2rem] border border-white/5">
             <button onClick={() => setIsProMode(false)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!isProMode ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600'}`}>Flash</button>
             <button onClick={() => setIsProMode(true)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isProMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-600'}`}>Pro</button>
          </div>
        </section>

        {error && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-400 text-[11px] font-black uppercase tracking-widest text-center shadow-2xl animate-in slide-in-from-top-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-12">
            <div className="glass-panel rounded-[3.5rem] p-10 space-y-10 premium-border shadow-2xl relative">
              
              {/* Image Input Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleImageUpload(e.dataTransfer.files[0]); }}
                className={`aspect-square rounded-[2.5rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center cursor-pointer group overflow-hidden relative ${selectedImage ? 'border-transparent' : 'border-white/10 hover:border-indigo-500/50 bg-white/[0.01]'}`}
              >
                {selectedImage ? (
                  <>
                    <img src={selectedImage} className="w-full h-full object-cover transition-transform duration-[5s] group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <span className="text-[10px] font-black uppercase tracking-widest">Alterar Imagem</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8 space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto group-hover:bg-indigo-500/20 transition-colors">
                      <svg className="w-6 h-6 text-zinc-600 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Arraste seu Asset</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} className="hidden" accept="image/*" />
              </div>

              {/* Command Area */}
              <div className="space-y-8">
                <div className="relative">
                  <textarea 
                    value={command} 
                    onChange={(e) => setCommand(e.target.value)} 
                    className="w-full bg-black/40 border border-white/5 rounded-[2rem] p-8 text-sm text-zinc-300 min-h-[160px] outline-none focus:border-indigo-500/40 transition-all placeholder:text-zinc-800 leading-relaxed shadow-inner" 
                    placeholder="Quais modificações devemos aplicar?"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={handleOpenKey} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-all" title="Configurar API">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button 
                      key={s.id}
                      onClick={() => setCommand(prev => `${prev} ${s.prompt}`.trim())}
                      className="px-5 py-2.5 bg-zinc-900 border border-white/5 rounded-full text-[9px] font-black text-zinc-500 hover:text-white hover:border-indigo-500/30 transition-all uppercase tracking-widest"
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleSubmit} 
                  disabled={isProcessing || !selectedImage} 
                  className={`w-full py-6 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.5em] transition-all relative overflow-hidden btn-primary ${isProcessing ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                >
                  {isProcessing ? "PROCESSANDO..." : "EXECUTAR PIPELINE"}
                  <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity"></div>
                </button>
              </div>
            </div>
          </div>

          {/* Display Column */}
          <div className="lg:col-span-7 space-y-12">
            {isProcessing ? (
              <div className="aspect-[4/5] glass-panel rounded-[4rem] flex flex-col items-center justify-center premium-border">
                <div className="w-20 h-20 relative">
                  <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                </div>
                <div className="mt-12 space-y-4 text-center">
                  <p className="text-[12px] font-black uppercase text-indigo-400 tracking-[0.6em] animate-pulse">Renderizando Master Vision</p>
                  <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">Sincronizando malhas neurais de alta fidelidade</p>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-12 animate-in fade-in duration-1000">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 p-1.5 bg-zinc-900/50 rounded-2xl border border-white/5">
                    <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.GALLERY ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Grade</button>
                    <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Split</button>
                  </div>
                  <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Build ID: {result.id}</span>
                </div>

                {viewMode === ViewMode.GALLERY ? (
                  <div className="grid grid-cols-1 gap-12">
                    {result.versions.map((v, i) => (
                      <div key={v.id} className="group relative glass-panel rounded-[3.5rem] overflow-hidden premium-border shadow-2xl transition-all duration-500 hover:scale-[1.01]">
                        <img src={v.imageUrl} className="w-full object-cover aspect-[4/5]" alt={`Variação ${i+1}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-12 space-y-6">
                           <div className="space-y-2">
                             <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Variante Técnica {i+1}</p>
                             <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">8K • Professional • {v.style}</p>
                           </div>
                           <div className="flex gap-4">
                             <button onClick={() => { setSelectedImage(v.imageUrl); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="flex-1 py-4 bg-white text-black text-[10px] font-black uppercase rounded-2xl hover:bg-indigo-50 transition-all active:scale-95">Refinar Este Asset</button>
                             <button onClick={() => window.open(v.imageUrl)} className="p-4 bg-zinc-900 rounded-2xl text-white hover:bg-indigo-500 transition-all">
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                             </button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[4rem] overflow-hidden premium-border glass-panel p-8 space-y-10 shadow-2xl">
                    <BeforeAfterSlider before={result.originalAlignedUrl || ''} after={result.versions[activeCompareIdx]?.imageUrl || ''} />
                    <div className="flex gap-6 overflow-x-auto pb-4 px-2 custom-scrollbar">
                       {result.versions.map((v, idx) => (
                         <button key={v.id} onClick={() => setActiveCompareIdx(idx)} className={`w-28 h-28 rounded-3xl border-2 shrink-0 overflow-hidden transition-all duration-500 ${activeCompareIdx === idx ? 'border-indigo-500 scale-105 shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 'border-zinc-800 opacity-40 hover:opacity-60 grayscale'}`}>
                            <img src={v.imageUrl} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                         </button>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[600px] border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-center p-20 bg-white/[0.01]">
                <div className="w-32 h-32 bg-zinc-950 rounded-[3rem] flex items-center justify-center mb-10 border border-white/5 shadow-2xl floating">
                  <svg className="w-12 h-12 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <h2 className="text-[14px] font-black uppercase tracking-[1em] text-zinc-800 mb-4 ml-[1em]">Engine Standby</h2>
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-900 max-w-xs leading-loose">Aguardando entrada de dados para inicializar o pipeline criativo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
