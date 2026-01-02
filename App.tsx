
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { processImageRequest } from './services/gemini';
import { ProcessingResult, ViewMode } from './types';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { saveProject, getAllProjects, deleteProject, clearAllProjects } from './services/storage';

const STYLES = [
  { id: 'vogue', label: 'Vogue', icon: '📸', prompt: 'High fashion editorial' },
  { id: 'cinematic', label: 'Movie', icon: '🎬', prompt: 'Cinematic lighting' },
  { id: 'noir', label: 'Noir', icon: '🌑', prompt: 'B&W Artistic' },
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
  const [isProMode, setIsProMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const startApp = async () => {
      try {
        const saved = await getAllProjects().catch(() => []);
        setProjects(saved);
        if (saved.length > 0) setResult(saved[0]);
        setTimeout(() => setIsInitializing(false), 800);
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

  const handleSubmit = async () => {
    if (!selectedImage) return;

    // Se estiver no modo PRO ou precisar de chave, abre o seletor apenas se necessário
    const aistudio = (window as any).aistudio;
    if (isProMode && aistudio) {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await aistudio.openSelectKey();
        // Prossegue após o trigger do diálogo conforme as regras de race condition
      }
    }

    setIsProcessing(true);
    setError(null);
    try {
      const data = await processImageRequest(selectedImage, command, 3, isProMode);
      await saveProject(data);
      setResult(data);
      setProjects(await getAllProjects());
      setViewMode(ViewMode.GALLERY);
    } catch (err: any) {
      setError(err?.message || "Erro na geração.");
      setTimeout(() => setError(null), 5000); // Limpa erro automaticamente
    } finally {
      setIsProcessing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-[#020202] flex items-center justify-center">
        <div className="w-12 h-12 bg-indigo-500 rounded-2xl animate-pulse shadow-2xl shadow-indigo-500/50"></div>
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
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 space-y-16">
        
        {/* Simplified Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white italic">
              Studio<span className="text-indigo-500">Master</span>
            </h1>
            <p className="text-[9px] font-black uppercase tracking-[0.6em] text-zinc-700 mt-2">Next Gen Visual Engine</p>
          </div>
          
          <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
             <button onClick={() => setIsProMode(false)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!isProMode ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Flash</button>
             <button onClick={() => setIsProMode(true)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${isProMode ? 'bg-indigo-500 text-white shadow-lg' : 'text-zinc-600'}`}>Pro</button>
          </div>
        </header>

        {/* Temporary Error Toast */}
        {error && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-4 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-top-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Main Controls */}
          <div className="lg:col-span-5 space-y-10">
            <div className="glass-panel rounded-[3.5rem] p-10 premium-border shadow-2xl space-y-10">
              
              {/* Image Box */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-square rounded-[2.5rem] border-2 border-dashed transition-all duration-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative ${selectedImage ? 'border-transparent' : 'border-white/10 hover:border-indigo-500/50 bg-black/40'}`}
              >
                {selectedImage ? (
                  <img src={selectedImage} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700">Importar Asset</span>
                )}
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} className="hidden" accept="image/*" />
              </div>

              {/* Input Area */}
              <div className="space-y-6">
                <div className="relative group">
                  <textarea 
                    value={command} 
                    onChange={(e) => setCommand(e.target.value)} 
                    className="w-full bg-black/60 border border-white/5 rounded-[2.5rem] p-8 text-sm text-zinc-300 min-h-[160px] outline-none focus:border-indigo-500/40 transition-all placeholder:text-zinc-800 leading-relaxed" 
                    placeholder="Comandos de edição..."
                  />
                  <button 
                    onClick={handleSubmit} 
                    disabled={isProcessing || !selectedImage} 
                    className={`absolute bottom-4 right-4 p-5 rounded-[1.5rem] transition-all ${isProcessing ? 'bg-zinc-800' : 'bg-white hover:bg-indigo-50 active:scale-95 shadow-xl'}`}
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {STYLES.map(s => (
                    <button key={s.id} onClick={() => setCommand(prev => `${prev} ${s.prompt}`.trim())} className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-full text-[9px] font-black text-zinc-500 hover:text-white transition-all uppercase">{s.icon} {s.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div className="lg:col-span-7">
            {isProcessing ? (
              <div className="aspect-[4/5] glass-panel rounded-[4rem] flex flex-col items-center justify-center premium-border">
                <div className="w-16 h-16 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                <p className="mt-8 text-[11px] font-black uppercase text-indigo-400 tracking-[0.5em]">Processando...</p>
              </div>
            ) : result ? (
              <div className="space-y-10">
                <div className="flex gap-2 p-1 bg-zinc-900 rounded-2xl w-fit border border-white/5">
                  <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase ${viewMode === ViewMode.GALLERY ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Galeria</button>
                  <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase ${viewMode === ViewMode.COMPARISON ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Comparar</button>
                </div>

                {viewMode === ViewMode.GALLERY ? (
                  <div className="grid grid-cols-1 gap-12">
                    {result.versions.map((v, i) => (
                      <div key={v.id} className="glass-panel rounded-[3.5rem] overflow-hidden premium-border shadow-2xl">
                        <img src={v.imageUrl} className="w-full object-cover aspect-[4/5]" />
                        <div className="p-8 flex justify-between items-center bg-black/20">
                           <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Variante {i+1}</span>
                           <button onClick={() => window.open(v.imageUrl)} className="text-[9px] font-black text-white bg-white/5 px-6 py-3 rounded-xl uppercase hover:bg-white/10 transition-all">Download</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[4rem] overflow-hidden premium-border glass-panel p-6 shadow-2xl">
                    <BeforeAfterSlider before={result.originalAlignedUrl || ''} after={result.versions[activeCompareIdx]?.imageUrl || ''} />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[500px] border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center opacity-20">
                <svg className="w-20 h-20 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
