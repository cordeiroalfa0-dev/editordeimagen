
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { processImageRequest } from './services/gemini';
import { ProcessingResult, ViewMode } from './types';
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
      console.log("[StudioMaster] Inicializando Engine...");
      try {
        // Carregamento Seguro do LocalStorage
        try {
          const draftImg = localStorage.getItem('visionedit_draft_image');
          const draftCmd = localStorage.getItem('visionedit_draft_command');
          if (draftImg) setSelectedImage(draftImg);
          if (draftCmd) setCommand(draftCmd);
        } catch (e) {
          console.warn("[StudioMaster] LocalStorage inacessível");
        }

        // Carregar Projetos
        const saved = await getAllProjects().catch(() => []);
        setProjects(saved);
        if (saved.length > 0) setResult(saved[0]);
        
        // Timeout de segurança para evitar tela preta infinita
        setTimeout(() => setIsInitializing(false), 800);
      } catch (err) {
        console.error("[StudioMaster] Falha crítica na inicialização:", err);
        setIsInitializing(false);
      }
    };
    startApp();
  }, []);

  useEffect(() => {
    if (selectedImage) {
      try { localStorage.setItem('visionedit_draft_image', selectedImage); } catch(e) {}
    }
    try { localStorage.setItem('visionedit_draft_command', command); } catch(e) {}
  }, [selectedImage, command]);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setSelectedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedImage) return;
    
    // Verificação de Chave Mandatória para Pro/Grounding
    if (isProMode || useGrounding) {
      const aistudio = (window as any).aistudio;
      if (aistudio && !(await aistudio.hasSelectedApiKey())) {
        await aistudio.openSelectKey();
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
      setError(err?.message || "Erro inesperado na renderização.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-[#020202] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-indigo-500 rounded-xl mb-6 animate-bounce shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>
        <h2 className="text-white font-black uppercase tracking-[0.4em] text-xs">Studio Master</h2>
        <p className="text-zinc-600 text-[10px] mt-2 uppercase tracking-widest animate-pulse-slow">Sincronizando ambiente de produção...</p>
      </div>
    );
  }

  return (
    <Layout 
      projects={projects} 
      activeProjectId={result?.id} 
      onSelectProject={handleSelectProject => {
        setResult(handleSelectProject);
        setSelectedImage(handleSelectProject.versions[0]?.imageUrl || handleSelectProject.originalAlignedUrl || null);
        setViewMode(ViewMode.GALLERY);
      }}
      onDeleteProject={async (id) => { 
        await deleteProject(id); 
        const updated = await getAllProjects();
        setProjects(updated);
        if (result?.id === id) setResult(null);
      }}
      onClearHistory={async () => { await clearAllProjects(); setProjects([]); setResult(null); }}
      onExportLibrary={() => {}}
      onGeneratePython={() => {}}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-12 animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white italic">
              Studio<span className="text-indigo-500">Master</span>
            </h1>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em]">Engine Visual v4.0 • Online</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
             <button onClick={() => setUseGrounding(!useGrounding)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all border ${useGrounding ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                Grounding {useGrounding ? 'ON' : 'OFF'}
             </button>
             <div className="flex bg-zinc-900 p-1 rounded-2xl border border-white/5">
                <button onClick={() => setIsProMode(false)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!isProMode ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Flash</button>
                <button onClick={() => setIsProMode(true)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isProMode ? 'bg-indigo-500 text-white' : 'text-zinc-500'}`}>Pro</button>
             </div>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-8">
            <section 
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) handleImageUpload(e.dataTransfer.files[0]);
              }}
              className={`glass-card rounded-[3rem] p-8 space-y-8 premium-border transition-all ${dragActive ? 'border-indigo-500 scale-[1.02]' : ''}`}
            >
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className="aspect-square rounded-[2.5rem] border-2 border-dashed border-white/10 overflow-hidden cursor-pointer relative bg-black/40 group"
              >
                {selectedImage ? (
                  <img src={selectedImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s]" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700">
                    <svg className="w-12 h-12 mb-4 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v16m8-8H4"/></svg>
                    <span className="font-black text-[10px] uppercase tracking-[0.3em]">Carregar Imagem</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} className="hidden" accept="image/*" />
              </div>

              <div className="space-y-6">
                <textarea 
                  value={command} 
                  onChange={(e) => setCommand(e.target.value)} 
                  className="w-full bg-black/60 border border-white/5 rounded-3xl p-6 text-sm text-zinc-300 min-h-[120px] outline-none focus:border-indigo-500/40 transition-all placeholder:text-zinc-800" 
                  placeholder="Descreva as alterações..."
                />
                <button 
                  onClick={handleSubmit} 
                  disabled={isProcessing || !selectedImage} 
                  className={`w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all ${isProcessing ? 'bg-zinc-800 text-zinc-600' : 'bg-white text-black hover:bg-indigo-50'}`}
                >
                  {isProcessing ? "Executando..." : "Renderizar"}
                </button>
              </div>
            </section>
          </div>

          <div className="lg:col-span-8">
            {isProcessing ? (
              <div className="aspect-square glass-card rounded-[4rem] flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="mt-8 text-[11px] font-black uppercase text-indigo-400 tracking-[0.5em]">Processando Visão IA</p>
              </div>
            ) : result ? (
              <div className="space-y-12">
                <div className="flex gap-4 p-1 bg-zinc-900/50 w-fit rounded-2xl">
                  <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase ${viewMode === ViewMode.GALLERY ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Galeria</button>
                  <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase ${viewMode === ViewMode.COMPARISON ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Slider</button>
                </div>

                {viewMode === ViewMode.GALLERY ? (
                  result.versions.map((v, i) => (
                    <div key={v.id} className="glass-card rounded-[3rem] overflow-hidden premium-border mb-8 shadow-2xl">
                      <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Variante {i+1}</span>
                        <button onClick={() => { setSelectedImage(v.imageUrl); window.scrollTo(0,0); }} className="px-4 py-2 bg-white text-black text-[9px] font-black uppercase rounded-lg">Editar Esta</button>
                      </div>
                      <img src={v.imageUrl} className="w-full object-cover" />
                    </div>
                  ))
                ) : (
                  <div className="rounded-[3rem] overflow-hidden premium-border glass-card p-4">
                    <BeforeAfterSlider before={result.originalAlignedUrl || ''} after={result.versions[activeCompareIdx]?.imageUrl || ''} />
                    <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
                       {result.versions.map((v, idx) => (
                         <button key={v.id} onClick={() => setActiveCompareIdx(idx)} className={`w-20 h-20 rounded-xl border-2 shrink-0 overflow-hidden ${activeCompareIdx === idx ? 'border-indigo-500' : 'border-zinc-800 opacity-50'}`}>
                            <img src={v.imageUrl} className="w-full h-full object-cover" />
                         </button>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-zinc-800 text-center p-12">
                <svg className="w-16 h-16 mb-6 opacity-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">Studio em Standby</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
