
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
      <div className="max-w-5xl mx-auto px-6 py-6 md:py-12 space-y-10">
        
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-black italic tracking-tighter text-white">VISION MASTER <span className="text-indigo-500">ULTRA</span></h1>
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.6em] mt-1">Troca de Roupa & Ajuste de Postura Ativos</p>
          </div>
          
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-zinc-900 rounded-full border border-white/5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Motor de Tecidos Ativo</span>
            </div>
            <div className="px-4 py-2 bg-zinc-900 rounded-full border border-white/5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Anatomia OK</span>
            </div>
          </div>
        </header>

        {statusMsg && (
          <div className="bg-zinc-900 border border-white/10 p-5 rounded-[2rem] text-center shadow-2xl">
            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">{statusMsg.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* PAINEL DE COMANDO */}
          <div className="space-y-8">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[4/5] bg-zinc-900/50 rounded-[3rem] border border-white/5 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-zinc-900 transition-all shadow-2xl group"
            >
              {selectedImage ? (
                <img src={selectedImage} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center space-y-4 opacity-20 group-hover:opacity-40 transition-all">
                  <div className="text-4xl">+</div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Carregar Foto Base</span>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" accept="image/*" />
            </div>

            <div className="bg-zinc-900/30 p-8 rounded-[3rem] border border-white/5 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-2">Instrução de Transformação</label>
                <textarea 
                  value={command}
                  onChange={e => setCommand(e.target.value)}
                  className="w-full bg-black/50 border border-white/5 rounded-3xl p-6 text-sm outline-none focus:border-indigo-500/30 min-h-[140px] resize-none transition-all"
                  placeholder="Ex: Troque a roupa por um vestido vermelho e deixe ela em pé na praia..."
                />
              </div>

              <button 
                onClick={handleRun}
                disabled={isProcessing || !selectedImage}
                className={`w-full py-7 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.5em] transition-all shadow-2xl ${isProcessing ? 'bg-zinc-800 text-zinc-600 cursor-wait animate-pulse' : 'bg-white text-black hover:bg-indigo-500 hover:text-white active:scale-95'}`}
              >
                {isProcessing ? 'RECOMPONDO CENA...' : 'APLICAR MUDANÇAS'}
              </button>
            </div>
          </div>

          {/* PAINEL DE RESULTADO */}
          <div className="space-y-8">
            {isProcessing ? (
              <div className="aspect-[4/5] bg-black rounded-[3rem] border border-white/5 flex flex-col items-center justify-center space-y-8 shadow-2xl">
                <div className="relative">
                   <div className="w-20 h-20 border border-white/5 rounded-full animate-ping absolute inset-0"></div>
                   <div className="w-20 h-20 border-2 border-zinc-900 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.8em] text-indigo-500">Analisando Malha</p>
                  <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Substituindo Vestuário...</p>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
                <div className="flex justify-center gap-3 bg-zinc-900/80 p-1.5 rounded-2xl w-fit mx-auto border border-white/5 backdrop-blur-xl">
                  <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.GALLERY ? 'bg-indigo-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Nova Versão</button>
                  <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === ViewMode.COMPARISON ? 'bg-indigo-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Comparação</button>
                </div>
                
                {viewMode === ViewMode.GALLERY ? (
                  <div className="space-y-6">
                    {result.versions.map(v => (
                      <div key={v.id} className="rounded-[3rem] overflow-hidden border border-white/5 bg-zinc-900 group relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                        <img src={v.imageUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-10">
                          <button onClick={() => window.open(v.imageUrl)} className="w-full py-5 bg-white text-black font-black text-[11px] uppercase rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl">Download HD</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl backdrop-blur-3xl bg-zinc-900/50 p-1">
                    <BeforeAfterSlider before={result.originalAlignedUrl || ''} after={result.versions[0]?.imageUrl || ''} />
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-[4/5] border border-dashed border-white/5 rounded-[3.5rem] flex flex-col items-center justify-center opacity-10 bg-zinc-900/20">
                 <svg className="w-20 h-20 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                 <p className="text-[11px] font-black uppercase tracking-[0.4em]">Pronto para Renderizar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
