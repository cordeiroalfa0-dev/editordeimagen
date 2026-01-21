
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { processImageRequest } from './services/gemini';
import { exportToCanva } from './services/canva';
import { generatePythonScript } from './services/pythonExporter';
import { ProcessingResult, Folder, AspectRatio, ImageSize, ModelMode } from './types';
import { 
  getAllProjects, 
  saveProject, 
  deleteProject, 
  clearAllProjects,
  getAllFolders,
  saveFolder,
  deleteFolder,
  updateProjectFolder
} from './services/storage';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Removed readonly modifier to resolve error: All declarations of 'aistudio' must have identical modifiers.
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const OPERATOR_EMAIL = "emerson.cordeiro00894687@sesisenaipr.org.br";
  
  const [modelMode, setModelMode] = useState<ModelMode>('Standard');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [stylePreset, setStylePreset] = useState('Cinematográfico High-End');
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFullscreenView, setIsFullscreenView] = useState(false);
  
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [projects, setProjects] = useState<ProcessingResult[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(undefined);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    refreshData();
  }, []);

  // Bloqueio de scroll do body quando o modal está ativo
  useEffect(() => {
    if (isFullscreenView) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isFullscreenView]);

  const refreshData = async () => {
    try {
      const p = await getAllProjects();
      const f = await getAllFolders();
      setProjects(p || []);
      setFolders(f || []);
    } catch (e) {
      console.warn("Sync failed, using cache.");
    }
  };

  const handleRestoreV1 = () => {
    if (confirm("RESTAURAR PARÂMETROS V1 ESTÁVEIS? (Isso resetará a interface atual)")) {
      setSelectedImage(null);
      setCommand('');
      setResult(null);
      setModelMode('Standard');
      setAspectRatio('1:1');
      setImageSize('1K');
      setStatusMsg({ text: "NÚCLEO V1 ESTÁVEL RESTAURADO", type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleExportPython = () => {
    const script = generatePythonScript(process.env.API_KEY || '', { mode: modelMode }, command);
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visionos_pipeline_${Date.now()}.py`;
    link.click();
    setStatusMsg({ text: "SCRIPT PYTHON EXPORTADO", type: 'success' });
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const handleCanvaExport = async () => {
    if (!result) return;
    setStatusMsg({ text: "CONECTANDO AO CANVA PRO...", type: 'info' });
    const res = await exportToCanva(result.versions[0].imageUrl, command, OPERATOR_EMAIL);
    if (res.success) {
      window.open(res.designUrl, '_blank');
      setStatusMsg({ text: "SINCRONIZADO COM CANVA", type: 'success' });
    }
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setStatusMsg({ text: "MATRIZ CARREGADA COM SUCESSO", type: 'success' });
        setTimeout(() => setStatusMsg(null), 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModeSwitch = async (mode: ModelMode) => {
    if (mode === 'Pro') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    }
    setModelMode(mode);
  };

  const downloadImage = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.versions[0].imageUrl;
    link.download = `VISIONOS-MASTER-${result.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatusMsg({ text: "EXPORTAÇÃO PNG CONCLUÍDA", type: 'success' });
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const handleRunImage = async () => {
    if (!command.trim()) {
      setStatusMsg({ text: "DIGITE UM COMANDO NEURAL", type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatusMsg({ text: "PROCESSANDO RENDER DE ALTA FIDELIDADE...", type: 'info' });
    
    try {
      const data = await processImageRequest(
        selectedImage, 
        `${command}. Style: ${stylePreset}`, 
        modelMode, 
        aspectRatio, 
        imageSize, 
        "", 
        "Edit"
      );
      
      if (!data.error) {
        setResult(data);
        await saveProject(data);
        await refreshData();
        setStatusMsg({ text: "RENDER COMPLETO - V1 STABLE", type: 'success' });
      } else {
        if (data.error.includes("ACESSO NEGADO") || data.error.includes("Requested entity was not found.")) {
           setStatusMsg({ text: "CHAVE INVÁLIDA: REABRINDO SELETOR...", type: 'warning' });
           await window.aistudio.openSelectKey();
        } else {
           setStatusMsg({ text: "FALHA NO RENDER: " + data.error, type: 'error' });
        }
      }
    } catch (e: any) {
      setStatusMsg({ text: "ERRO CRÍTICO NO KERNEL DE IMAGEM", type: 'error' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  return (
    <Layout 
      projects={projects} 
      folders={folders} 
      activeProjectId={result?.id} 
      activeFolderId={activeFolderId} 
      operatorEmail={OPERATOR_EMAIL}
      onSelectProject={p => setResult(p)}
      onDeleteProject={async id => { await deleteProject(id); refreshData(); }}
      onClearHistory={async () => { if(confirm("Deseja deletar permanentemente todo o histórico Master?")) { await clearAllProjects(); refreshData(); setResult(null); } }}
      onCreateFolder={async n => { await saveFolder({id: `F-${Date.now()}`, name: n, timestamp: Date.now()}); refreshData(); }}
      onSelectFolder={setActiveFolderId}
      onDeleteFolder={async id => { await deleteFolder(id); refreshData(); }}
      onMoveProject={updateProjectFolder}
      onRestoreV1={handleRestoreV1}
      onGeneratePython={handleExportPython}
    >
      <div className="w-full flex flex-col p-6 lg:p-10 min-h-full max-w-[1600px] mx-auto">
        
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6 border-b border-white/5 pb-10">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-3">STUDIO MASTER V1</h1>
            <div className="flex items-center gap-4">
               <span className="px-3 py-1 bg-rose-600/10 text-rose-500 text-[9px] font-black uppercase tracking-[0.3em] rounded-md border border-rose-500/20">CORE STABLE</span>
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SISTEMA OTIMIZADO PARA ALTA PERFORMANCE</p>
            </div>
          </div>
          <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-3xl shadow-2xl">
            <button onClick={() => handleModeSwitch('Standard')} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modelMode === 'Standard' ? 'bg-white text-black shadow-2xl' : 'text-zinc-500 hover:text-white'}`}>PADRÃO</button>
            <button onClick={() => handleModeSwitch('Pro')} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modelMode === 'Pro' ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-white'}`}>PRO / 4K</button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          
          <div className="xl:col-span-4 space-y-8">
            <div className="glass-panel p-8 rounded-[3rem] space-y-8 shadow-2xl ring-1 ring-white/5">
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className={`relative p-10 border-2 border-dashed rounded-[2.5rem] cursor-pointer flex flex-col items-center justify-center min-h-[220px] transition-all group ${selectedImage ? 'border-rose-500 bg-rose-500/5' : 'border-zinc-800 bg-black/40 hover:border-rose-500/30'}`}
              >
                {selectedImage && <img src={selectedImage} className="absolute inset-0 w-full h-full object-cover rounded-[2.3rem] opacity-30 grayscale hover:grayscale-0 transition-all duration-700" />}
                <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500/20 transition-all duration-500 shadow-xl border border-white/5">
                    <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" stroke="currentColor"/></svg>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">{selectedImage ? 'REMPLAÇAR MATRIZ' : 'CARREGAR MATRIZ'}</span>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase px-2 tracking-[0.2em]">RESOLUÇÃO</label>
                    <select value={imageSize} onChange={e => setImageSize(e.target.value as ImageSize)} className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-[11px] font-bold text-white uppercase outline-none focus:border-rose-500 transition-colors cursor-pointer shadow-inner">
                      <option value="1K">HD (1K)</option>
                      <option value="2K">ULTRA (2K)</option>
                      <option value="4K">MASTER (4K)</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase px-2 tracking-[0.2em]">ASPECT RATIO</label>
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl text-[11px] font-bold text-white uppercase outline-none focus:border-rose-500 transition-colors cursor-pointer shadow-inner">
                      <option value="1:1">1:1 QUADRADO</option>
                      <option value="16:9">16:9 CINEMA</option>
                      <option value="9:16">9:16 MOBILE</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black text-zinc-500 uppercase px-2 tracking-[0.2em]">COMANDO NEURAL V1</label>
                   <textarea 
                     value={command} onChange={e => setCommand(e.target.value)}
                     className="w-full bg-black/60 p-6 rounded-3xl text-[13px] outline-none border border-white/10 focus:border-rose-500 min-h-[160px] text-white resize-none placeholder:text-zinc-800 shadow-inner leading-relaxed transition-all"
                     placeholder="Ex: Transforme em uma cena futurista de Cyberpunk com iluminação neon azul e rosa, ultra-detalhado..."
                   />
                </div>

                <button 
                  onClick={handleRunImage} disabled={isProcessing} 
                  className={`w-full py-8 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.5em] transition-all relative overflow-hidden group ${isProcessing ? 'bg-zinc-900 text-zinc-600' : 'bg-rose-600 text-white shadow-[0_20px_50px_rgba(225,29,72,0.3)] hover:scale-[1.02] active:scale-95 hover:bg-rose-500'}`}
                >
                  <span className="relative z-10">{isProcessing ? 'GERANDO MATRIX...' : 'INICIAR RENDER MASTER'}</span>
                </button>
              </div>
            </div>

            {/* PAINEL DE MÓDULOS PRO */}
            {result && (
              <div className="glass-panel p-8 rounded-[3rem] border border-white/5 space-y-6">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Pipeline de Exportação</span>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleCanvaExport} className="flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-3xl transition-all border border-white/5 hover:border-blue-500/40 group">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                       <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12.9 6.85c.18-.3.45-.4.75-.4s.57.1.75.4l4.2 7c.18.3.18.7 0 1s-.45.4-.75.4H9.15c-.3 0-.57-.1-.75-.4s-.18-.7 0-1l4.2-7z"/></svg>
                    </div>
                    <span className="text-[9px] font-black uppercase text-zinc-400 group-hover:text-white tracking-widest">Canva Pro</span>
                  </button>
                  <button onClick={handleExportPython} className="flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-3xl transition-all border border-white/5 hover:border-emerald-500/40 group">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                       <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
                    </div>
                    <span className="text-[9px] font-black uppercase text-zinc-400 group-hover:text-white tracking-widest">Python SDK</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-8 space-y-8">
            <div className="aspect-video w-full bg-black/80 rounded-[4rem] border border-white/5 overflow-hidden shadow-3xl relative group ring-1 ring-white/10">
              {result ? (
                <div className="w-full h-full relative">
                  {selectedImage ? (
                    <BeforeAfterSlider before={selectedImage} after={result.versions[0].imageUrl} />
                  ) : (
                    <div className="w-full h-full p-12 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(20,20,20,1),rgba(0,0,0,1))]">
                      <img src={result.versions[0].imageUrl} className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5" alt="Master Render" />
                    </div>
                  )}

                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-6 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-6 group-hover:translate-y-0 z-[150] pointer-events-auto">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsFullscreenView(true); }}
                      className="px-10 py-5 bg-white/10 backdrop-blur-3xl text-white rounded-full font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:bg-white/20 hover:scale-110 active:scale-90 transition-all flex items-center gap-4 border border-white/20 pointer-events-auto"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      INSPECIONAR MASTER
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); downloadImage(); }}
                      className="px-12 py-5 bg-rose-600 text-white rounded-full font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_25px_60px_rgba(225,29,72,0.5)] hover:scale-110 active:scale-90 transition-all flex items-center gap-4 border border-white/30 pointer-events-auto"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      BAIXAR PNG V1
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <p className="text-[14px] font-black uppercase tracking-[1.5em] text-zinc-800 animate-pulse relative z-10">CANVAS MASTER AGUARDANDO</p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center z-[250]">
                  <div className="relative w-24 h-24 mb-8">
                     <div className="absolute inset-0 border-4 border-rose-600/20 rounded-full"></div>
                     <div className="absolute inset-0 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-[12px] font-black uppercase tracking-[0.6em] text-white animate-pulse">RECONSTRUINDO NÚCLEO... V1</p>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase mt-4 tracking-widest">Ajustando parâmetros de iluminação e textura</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isFullscreenView && result && (
        <div className="fixed inset-0 z-[3000] bg-black/98 backdrop-blur-3xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
           <div className="h-28 px-12 flex items-center justify-between border-b border-white/5 shrink-0 bg-black/50">
              <div className="flex flex-col">
                 <div className="flex items-center gap-3 mb-1">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981]"></span>
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">VISUALIZADOR MASTER V1 STABLE</span>
                 </div>
                 <span className="text-[14px] font-black text-white uppercase tracking-tighter">{result.id} • {result.versions[0].resolution} QUALITY</span>
              </div>
              <div className="flex items-center gap-6">
                 <button onClick={downloadImage} className="text-[10px] font-black text-zinc-400 hover:text-white uppercase tracking-widest transition-colors">EXPORTAR ATUAL</button>
                 <button 
                  onClick={() => setIsFullscreenView(false)}
                  className="px-10 py-5 bg-white hover:bg-zinc-200 text-black rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-90"
                 >
                   FECHAR INSPEÇÃO
                 </button>
              </div>
           </div>
           <div className="flex-1 overflow-auto p-6 md:p-12 flex items-center justify-center relative bg-[radial-gradient(circle_at_center,rgba(40,40,40,0.2),transparent)]">
              <img 
                src={result.versions[0].imageUrl} 
                className="max-w-full max-h-full object-contain shadow-[0_0_150px_rgba(0,0,0,0.9)] rounded-xl border border-white/5"
                alt="VisionOS Master High Fidelity"
              />
           </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

      {statusMsg && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 px-12 py-6 rounded-[2rem] bg-white text-black text-[11px] font-black uppercase tracking-[0.3em] z-[4000] shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex items-center gap-5 animate-in slide-in-from-bottom-10 border border-zinc-200">
          <div className={`w-3 h-3 rounded-full ${statusMsg.type === 'error' ? 'bg-rose-600 shadow-[0_0_15px_#e11d48]' : 'bg-emerald-500 shadow-[0_0_15px_#10b981]'}`}></div>
          <span className="max-w-[500px] truncate">{statusMsg.text}</span>
        </div>
      )}
    </Layout>
  );
};

export default App;
