
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { processImageRequest } from './services/gemini';
import { ProcessingResult, ViewMode, SystemLog, GeneratedVersion } from './types';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { saveProject, getAllProjects, deleteProject, clearAllProjects } from './services/storage';

const STYLES = [
  { id: 'cinematic', label: 'Cinemático', icon: '🎬', prompt: 'Cinematic lighting, movie scene, shallow depth of field, anamorphic lens' },
  { id: 'vogue', label: 'Vogue Editorial', icon: '📸', prompt: 'Vogue fashion editorial, high contrast, studio lighting, professional retouching' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '🌆', prompt: 'Neon lights, futuristic city background, synthwave colors, rainy atmosphere' },
  { id: 'vintage', label: 'Vintage 90s', icon: '🎞️', prompt: '90s film photography, grainy texture, warm tones, nostalgic mood' },
  { id: 'artistic', label: 'Pintura Óleo', icon: '🎨', prompt: 'Renaissance oil painting style, visible brushstrokes, dramatic chiaroscuro' },
];

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(() => localStorage.getItem('visionedit_draft_image'));
  const [command, setCommand] = useState(() => localStorage.getItem('visionedit_draft_command') || '');
  const [useGrounding, setUseGrounding] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [projects, setProjects] = useState<ProcessingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GALLERY);
  const [activeCompareIdx, setActiveCompareIdx] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedImage) {
      try { localStorage.setItem('visionedit_draft_image', selectedImage); } catch (e) {}
    }
  }, [selectedImage]);

  useEffect(() => {
    localStorage.setItem('visionedit_draft_command', command);
  }, [command]);

  useEffect(() => {
    const loadData = async () => {
      const saved = await getAllProjects();
      setProjects(saved);
      if (saved.length > 0 && !result) setResult(saved[0]);
    };
    loadData();
  }, []);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setSelectedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyStyle = (stylePrompt: string) => {
    setCommand((prev) => `${prev} ${stylePrompt}`.trim());
  };

  const handleSubmit = async () => {
    if (!selectedImage) return;

    // MANDATORY: API Key selection for Pro or Grounding modes as they use gemini-3-pro-image-preview
    if (isProMode || useGrounding) {
      const aistudio = (window as any).aistudio;
      if (aistudio && !(await aistudio.hasSelectedApiKey())) {
        await aistudio.openSelectKey();
        // Assuming success as per guidelines to mitigate race condition
      }
    }

    setIsProcessing(true);
    setError(null);
    try {
      const data = await processImageRequest(selectedImage, command, 3, isProMode, "1K", useGrounding);
      await saveProject(data);
      setResult(data);
      setProjects(await getAllProjects());
      setViewMode(ViewMode.GALLERY);
    } catch (err: any) {
      // If error suggests API key issues, prompt user to select key again
      if (err?.message?.includes("Requested entity was not found.")) {
        setError("API Key Error: Please select an API key from a paid GCP project.");
        const aistudio = (window as any).aistudio;
        if (aistudio) await aistudio.openSelectKey();
      } else {
        setError(err?.message || "Unexpected rendering error.");
      }
    } finally { setIsProcessing(false); }
  };

  const handleSelectProject = (project: ProcessingResult) => {
    setResult(project);
    setSelectedImage(project.versions[0]?.imageUrl || project.originalAlignedUrl || null);
    setViewMode(ViewMode.GALLERY);
  };

  // Fix for: Cannot find name 'handleUseAsBase'
  const handleUseAsBase = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout 
      projects={projects} 
      activeProjectId={result?.id} 
      onSelectProject={handleSelectProject}
      onDeleteProject={async (id) => { await deleteProject(id); setProjects(await getAllProjects()); }}
      onClearHistory={async () => { await clearAllProjects(); setProjects([]); setResult(null); }}
      onExportLibrary={() => {}}
      onGeneratePython={() => {}}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-12">
        {/* Header Superior */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 stagger-1">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white italic">
              Studio<span className="text-indigo-500">Master</span>
            </h1>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em]">Advanced Vision Intelligence • v4.0</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
             <button onClick={() => setUseGrounding(!useGrounding)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all border ${useGrounding ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                {useGrounding ? '🌐 Grounding On' : '🌐 Grounding Off'}
             </button>
             <div className="flex bg-zinc-900 p-1 rounded-2xl border border-white/5">
                <button onClick={() => setIsProMode(false)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!isProMode ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Flash</button>
                <button onClick={() => setIsProMode(true)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isProMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500'}`}>Pro</button>
             </div>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
            {error}
          </div>
        )}

        {/* Barra de Estilos Rápidos */}
        <div className="flex gap-4 overflow-x-auto pb-4 px-2 custom-scrollbar stagger-2">
           {STYLES.map(style => (
             <button 
              key={style.id} 
              onClick={() => handleApplyStyle(style.prompt)}
              className="flex items-center gap-3 px-6 py-4 bg-zinc-900/50 border border-white/5 rounded-[1.5rem] hover:bg-zinc-800 hover:border-indigo-500/30 transition-all shrink-0 group active:scale-95"
             >
                <span className="text-xl group-hover:scale-125 transition-transform">{style.icon}</span>
                <span className="text-[10px] font-black text-zinc-400 group-hover:text-white uppercase tracking-widest">{style.label}</span>
             </button>
           ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Workspace Lateral */}
          <div className="lg:col-span-4 space-y-8 stagger-3">
            <section 
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={`glass-card rounded-[3rem] p-8 space-y-8 premium-border transition-all ${dragActive ? 'border-indigo-500 scale-105 bg-indigo-500/5' : ''}`}
            >
              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  className="aspect-square rounded-[2.5rem] border-2 border-dashed border-white/10 overflow-hidden cursor-pointer relative bg-black/40 group"
                >
                  {selectedImage ? (
                    <img src={selectedImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s]" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700">
                      <svg className="w-12 h-12 mb-4 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                      <span className="font-black text-[10px] uppercase tracking-[0.3em]">Drop Image Here</span>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])} className="hidden" accept="image/*" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <textarea 
                    value={command} 
                    onChange={(e) => setCommand(e.target.value)} 
                    className="w-full bg-black/60 border border-white/5 rounded-3xl p-6 text-sm text-zinc-300 min-h-[140px] outline-none focus:border-indigo-500/40 transition-all placeholder:text-zinc-800 leading-relaxed shadow-inner" 
                    placeholder="Briefing: O que devemos recriar?"
                  />
                  {command && (
                    <button onClick={() => setCommand('')} className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={handleSubmit} 
                  disabled={isProcessing || !selectedImage} 
                  className={`w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all relative overflow-hidden ${isProcessing ? 'bg-zinc-800 text-zinc-600' : 'bg-white text-black hover:bg-indigo-50 active:scale-[0.96]'}`}
                >
                  {isProcessing ? "Rendering Scene..." : "Executar Pipeline"}
                </button>
              </div>
            </section>
          </div>

          {/* Área de Visualização */}
          <div className="lg:col-span-8 stagger-3">
            {isProcessing ? (
              <div className="aspect-square glass-card rounded-[4rem] flex flex-col items-center justify-center premium-border">
                <div className="w-24 h-24 relative mb-10">
                   <div className="absolute inset-0 border-2 border-indigo-500/10 rounded-full"></div>
                   <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
                </div>
                <div className="space-y-4 text-center">
                  <p className="text-[12px] font-black uppercase text-indigo-400 tracking-[0.6em]">Consultando Neural Engine</p>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Sincronizando luzes e vetores de profundidade</p>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-12">
                <div className="flex gap-2 p-1 bg-zinc-900/50 w-fit rounded-2xl border border-white/5">
                  <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.GALLERY ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Grade</button>
                  <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Slider</button>
                </div>

                {viewMode === ViewMode.GALLERY ? (
                  result.versions.map((v, i) => (
                    <div key={v.id} className="glass-card rounded-[3.5rem] overflow-hidden premium-border group shadow-2xl">
                      <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="flex flex-col items-center sm:items-start">
                          <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em]">Asset Ref. {i+1}</span>
                          <span className="text-[9px] font-bold text-zinc-600 mt-1 uppercase">Grounding Sources: {v.groundingUrls?.length || 0}</span>
                        </div>
                        <div className="flex gap-3">
                           <button onClick={() => handleUseAsBase(v.imageUrl)} className="px-6 py-3 bg-white text-black text-[10px] font-black uppercase rounded-xl hover:bg-zinc-100 transition-all">Refinar</button>
                           <button onClick={() => window.open(v.imageUrl)} className="p-3 bg-zinc-800/80 rounded-xl text-white hover:bg-zinc-700">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                           </button>
                        </div>
                      </div>
                      <img src={v.imageUrl} className="w-full aspect-square object-cover" />
                      {v.groundingUrls && (
                        <div className="p-6 bg-black/40 border-t border-white/5 overflow-x-auto">
                          <div className="flex gap-4 items-center">
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest shrink-0">Sources:</span>
                            {v.groundingUrls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-indigo-400 hover:text-white truncate max-w-[150px] uppercase underline">Fonte {idx+1}</a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[4rem] overflow-hidden premium-border glass-card p-4 md:p-6">
                    <BeforeAfterSlider before={result.originalAlignedUrl || ''} after={result.versions[activeCompareIdx]?.imageUrl || ''} />
                    <div className="mt-8 flex justify-center gap-4 overflow-x-auto pb-4 px-2">
                       {result.versions.map((v, idx) => (
                         <button key={v.id} onClick={() => setActiveCompareIdx(idx)} className={`w-20 h-20 rounded-2xl border-2 transition-all overflow-hidden shrink-0 ${activeCompareIdx === idx ? 'border-indigo-500 scale-110 shadow-xl' : 'border-zinc-800 opacity-40 grayscale'}`}>
                            <img src={v.imageUrl} className="w-full h-full object-cover" />
                         </button>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[500px] border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-zinc-800 p-12 text-center">
                <div className="w-24 h-24 bg-zinc-950 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/5 shadow-2xl">
                   <svg className="w-10 h-10 opacity-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>
                </div>
                <h2 className="text-[12px] font-black uppercase tracking-[1em] text-zinc-700">Studio Standby</h2>
                <p className="text-[9px] font-bold uppercase mt-4 tracking-widest text-zinc-800">Pronto para renderizar sua visão artística.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
