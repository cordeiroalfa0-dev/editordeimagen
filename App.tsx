
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { processImageRequest } from './services/gemini';
import { ProcessingResult, ViewMode, SystemLog, GeneratedVersion } from './types';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { saveProject, getAllProjects, deleteProject, clearAllProjects } from './services/storage';
import { generatePythonScript } from './services/pythonExporter';

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(() => localStorage.getItem('visionedit_draft_image'));
  const [command, setCommand] = useState(() => localStorage.getItem('visionedit_draft_command') || 'adicione agora uma bola de boliche na areia ao lado dela');
  
  const [numVersions] = useState(3);
  const [isProMode, setIsProMode] = useState(false);
  const [resolution] = useState<"1K" | "2K" | "4K">("1K");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [projects, setProjects] = useState<ProcessingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GALLERY);
  const [activeCompareIdx, setActiveCompareIdx] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedImage) {
      try {
        localStorage.setItem('visionedit_draft_image', selectedImage);
      } catch (e) {}
    }
  }, [selectedImage]);

  useEffect(() => {
    localStorage.setItem('visionedit_draft_command', command);
  }, [command]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const saved = await getAllProjects();
        setProjects(saved);
        if (saved.length > 0 && !result && !selectedImage) {
          handleSelectProject(saved[0]);
        } else if (saved.length > 0 && !result) {
          setResult(saved[0]);
        }
      } catch (e) {
        console.error("Erro banco local", e);
      } finally {
        setIsRestoring(false);
      }
    };
    loadInitialData();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUseAsBase = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setError(null);
    try {
      const data = await processImageRequest(selectedImage, command, numVersions, isProMode, resolution);
      await saveProject(data);
      setResult(data);
      const updated = await getAllProjects();
      setProjects(updated);
      setViewMode(ViewMode.GALLERY);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg === "QUOTA_EXCEEDED" || msg.includes('429')) {
        setError("Limite de Cota atingido. Aguarde 60s.");
      } else {
        setError(`Erro: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectProject = (project: ProcessingResult) => {
    setResult(project);
    setSelectedImage(project.versions[0]?.imageUrl || project.originalAlignedUrl || null);
    setViewMode(ViewMode.GALLERY);
    setActiveCompareIdx(0);
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm("Deletar?")) {
      await deleteProject(id);
      const updated = await getAllProjects();
      setProjects(updated);
      if (result?.id === id) {
        setResult(null);
        setSelectedImage(null);
        localStorage.removeItem('visionedit_draft_image');
      }
    }
  };

  return (
    <Layout 
      projects={projects} 
      activeProjectId={result?.id} 
      onSelectProject={handleSelectProject}
      onDeleteProject={handleDeleteProject}
      onClearHistory={async () => { if(confirm("Limpar tudo?")) { await clearAllProjects(); setProjects([]); setResult(null); setSelectedImage(null); localStorage.clear(); }}}
      onExportLibrary={() => {}}
      onGeneratePython={() => {}}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-6 md:space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase italic">Studio<span className="text-indigo-500">Master</span></h1>
            <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800 w-fit">
              <button onClick={() => { setIsProMode(false); setError(null); }} className={`px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase transition-all ${!isProMode ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-zinc-500'}`}>FLASH</button>
              <button onClick={() => { setIsProMode(true); setError(null); }} className={`px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase transition-all ${isProMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500'}`}>PRO</button>
            </div>
          </div>
          <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-xl w-full md:w-auto">
            <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.GALLERY ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Galeria</button>
            <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Comparar</button>
          </div>
        </header>

        {error && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
            <p className="text-xs text-amber-200 font-medium text-center md:text-left">{error}</p>
            <button onClick={handleSubmit} className="w-full md:w-auto px-6 py-2 bg-amber-500 text-black font-black text-[10px] uppercase rounded-xl hover:bg-amber-400 transition-all">Tentar Agora</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
            <section className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-6 space-y-6 backdrop-blur-xl">
              <div className="space-y-3">
                <p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest flex justify-between">
                  Área de Trabalho
                  {selectedImage && <span className="text-emerald-500">SYNC</span>}
                </p>
                <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed border-zinc-800 overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all group relative bg-zinc-950/40">
                  {selectedImage ? (
                    <img src={selectedImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 space-y-2 p-4 text-center">
                      <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                      <span className="font-black text-[9px] md:text-[10px] uppercase tracking-widest">Toque para Upload</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Instrução</p>
                <textarea 
                  value={command} 
                  onChange={(e) => setCommand(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 min-h-[80px] outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-800" 
                  placeholder="Ex: adicione óculos de sol..."
                />
                <button 
                  onClick={handleSubmit} 
                  disabled={isProcessing || !selectedImage} 
                  className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-2xl ${isProcessing ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-white text-black hover:bg-indigo-50 active:scale-95'}`}
                >
                  {isProcessing ? "Renderizando..." : "Aplicar Mudança"}
                </button>
              </div>
            </section>
          </div>

          <div className="lg:col-span-8 order-1 lg:order-2">
            {isProcessing ? (
              <div className="aspect-square bg-zinc-900/20 border border-zinc-800 rounded-[2rem] md:rounded-[3.5rem] flex flex-col items-center justify-center animate-pulse">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] px-4 text-center">Processando Pipeline Vision...</p>
              </div>
            ) : result ? (
              <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
                {viewMode === ViewMode.GALLERY && result.versions.map((v, i) => (
                  <div key={v.id} className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] md:rounded-[3.5rem] overflow-hidden group shadow-2xl">
                    <div className="p-4 md:p-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-center bg-zinc-950/80 backdrop-blur-md gap-4">
                      <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                        <span className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Variante {i+1} • {isProMode ? 'PRO' : 'FLASH'}</span>
                        <span className="text-[8px] font-bold text-zinc-700 uppercase">{v.id}</span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => handleUseAsBase(v.imageUrl)} className="flex-1 sm:flex-none px-4 py-2 bg-white text-black text-[9px] md:text-[10px] font-black uppercase rounded-lg hover:bg-zinc-200 transition-all active:scale-95">Editar Esta</button>
                        <button onClick={() => handleDownloadImage(v.imageUrl, `render-${v.id}.png`)} className="p-2.5 bg-zinc-800 rounded-lg text-white hover:bg-zinc-700 active:scale-95">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        </button>
                      </div>
                    </div>
                    <img src={v.imageUrl} className="w-full aspect-square object-cover" loading="lazy" />
                    <div className="p-6 md:p-8 bg-zinc-950/40">
                      <p className="text-xs md:text-sm text-zinc-400 italic font-medium leading-relaxed">"{v.description}"</p>
                    </div>
                  </div>
                ))}
                
                {viewMode === ViewMode.COMPARISON && result.originalAlignedUrl && (
                  <div className="animate-in zoom-in-95 duration-500">
                    <div className="rounded-[2rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl">
                      <BeforeAfterSlider before={result.originalAlignedUrl} after={result.versions[activeCompareIdx]?.imageUrl || result.versions[0].imageUrl} />
                    </div>
                    <div className="mt-6 md:mt-8 flex justify-center gap-3 overflow-x-auto pb-4 px-2">
                       {result.versions.map((v, idx) => (
                         <button 
                          key={v.id} 
                          onClick={() => setActiveCompareIdx(idx)}
                          className={`w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 shrink-0 transition-all overflow-hidden ${activeCompareIdx === idx ? 'border-indigo-500 scale-110 shadow-xl' : 'border-zinc-800 opacity-40'}`}
                         >
                            <img src={v.imageUrl} className="w-full h-full object-cover" />
                         </button>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[300px] md:min-h-[500px] border-2 border-dashed border-zinc-900 rounded-[2rem] md:rounded-[3.5rem] flex flex-col items-center justify-center text-zinc-700 p-8 text-center">
                <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-zinc-800">
                   <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">Pronto para Começar</p>
                <p className="text-[8px] font-bold uppercase mt-2 tracking-widest text-zinc-800">Selecione uma imagem de base para iniciar a edição mágica</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
