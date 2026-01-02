
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { processImageRequest } from './services/gemini';
import { ProcessingResult, ViewMode } from './types';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { getAllProjects, saveProject, deleteProject, clearAllProjects } from './services/storage';

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [projects, setProjects] = useState<ProcessingResult[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'error' | 'info' } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GALLERY);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllProjects().then(setProjects);
  }, []);

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRun = async () => {
    if (!selectedImage || isProcessing) return;
    setIsProcessing(true);
    setStatusMsg(null);
    
    try {
      const data = await processImageRequest(selectedImage, command);
      await saveProject(data);
      setResult(data);
      setProjects(await getAllProjects());
    } catch (e: any) {
      setStatusMsg({ text: e.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout 
      projects={projects} 
      activeProjectId={result?.id} 
      onSelectProject={p => { setResult(p); setSelectedImage(p.originalAlignedUrl || null); }}
      onDeleteProject={async id => { await deleteProject(id); setProjects(await getAllProjects()); }}
      onClearHistory={async () => { await clearAllProjects(); setProjects([]); }}
      onExportLibrary={() => {}}
      onGeneratePython={() => {}}
    >
      <div className="max-w-4xl mx-auto px-6 py-4 md:py-12 space-y-8">
        
        <header className="text-center space-y-1">
          <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter text-white">VISION MASTER PRO</h1>
          <p className="text-[7px] md:text-[9px] font-black text-zinc-600 uppercase tracking-[0.6em]">High-End Image Rendering Studio</p>
        </header>

        {statusMsg && (
          <div className={`p-4 rounded-2xl border text-center transition-all ${statusMsg.type === 'error' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
            <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{statusMsg.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* PAINEL DE CONTROLE */}
          <div className="space-y-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square bg-zinc-900 rounded-[2.5rem] border border-white/5 flex items-center justify-center overflow-hidden cursor-pointer shadow-inner relative group"
            >
              {selectedImage ? (
                <img src={selectedImage} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center opacity-20 group-hover:opacity-40 transition-all">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest">Importar Ativo</span>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" accept="image/*" />
            </div>

            <div className="space-y-4">
              <textarea 
                value={command}
                onChange={e => setCommand(e.target.value)}
                className="w-full bg-zinc-900 border border-white/5 rounded-3xl p-6 text-sm outline-none focus:border-white/20 min-h-[120px] resize-none"
                placeholder="Comando (Ex: Deixe em pé num estúdio...)"
              />

              <button 
                onClick={handleRun}
                disabled={isProcessing || !selectedImage}
                className={`w-full py-6 rounded-3xl font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl ${isProcessing ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed animate-pulse' : 'bg-white text-black hover:bg-indigo-500 hover:text-white active:scale-95'}`}
              >
                {isProcessing ? 'RENDERIZANDO...' : 'EXECUTAR AGORA'}
              </button>
            </div>
          </div>

          {/* PAINEL DE RESULTADO */}
          <div className="space-y-6">
            {isProcessing ? (
              <div className="aspect-square bg-zinc-950 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                   <div className="w-12 h-12 border border-white/10 rounded-full animate-ping absolute inset-0"></div>
                   <div className="w-12 h-12 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.8em] text-zinc-600">Calculando Geometria</p>
              </div>
            ) : result ? (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-center gap-2 bg-zinc-900/50 p-1 rounded-2xl w-fit mx-auto">
                  <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.GALLERY ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600'}`}>Versão Final</button>
                  <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600'}`}>Antes/Depois</button>
                </div>
                
                {viewMode === ViewMode.GALLERY ? (
                  <div className="space-y-4">
                    {result.versions.map(v => (
                      <div key={v.id} className="rounded-[2.5rem] overflow-hidden border border-white/5 bg-zinc-900 group relative shadow-2xl">
                        <img src={v.imageUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center p-6">
                          <button onClick={() => window.open(v.imageUrl)} className="w-full py-4 bg-white text-black font-black text-[10px] uppercase rounded-2xl hover:scale-105 active:scale-95 transition-all">Salvar na Galeria</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl backdrop-blur-xl">
                    <BeforeAfterSlider before={result.originalAlignedUrl || ''} after={result.versions[0]?.imageUrl || ''} />
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square border border-dashed border-white/10 rounded-[3.5rem] flex flex-col items-center justify-center opacity-10">
                 <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                 <p className="text-[10px] font-black uppercase tracking-widest">Aguardando Processamento</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
