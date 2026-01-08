
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { processImageRequest } from './services/gemini';
import { initializeCanvaSession } from './services/canva';
import { ProcessingResult, Folder, AspectRatio, ImageSize, ModelMode, PSDLayer } from './types';
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

const App: React.FC = () => {
  const OPERATOR_EMAIL = "emerson.cordeiro00894687@sesisenaipr.org.br";
  
  const [modelMode, setModelMode] = useState<ModelMode>('Standard');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("2K");
  const [genMode, setGenMode] = useState<'Edit' | 'Create' | 'Outpaint'>('Create');
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLayering, setIsLayering] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [projects, setProjects] = useState<ProcessingResult[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(undefined);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    refreshData();
    initializeCanvaSession(OPERATOR_EMAIL);
  }, []);

  const refreshData = async () => {
    const p = await getAllProjects();
    const f = await getAllFolders();
    setProjects(p);
    setFolders(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setGenMode('Edit');
        setStatusMsg({ text: "MATRIZ IDENTIFICADA - MODO EDIÇÃO ATIVADO", type: 'success' });
        setTimeout(() => setStatusMsg(null), 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePSD = async (imageUrl: string, id: string, layers?: PSDLayer[]) => {
    if (!layers) {
      setStatusMsg({ text: "MODO STANDARD É SINGLE-LAYER. USE MASTER PRO PARA CAMADAS.", type: 'warning' });
      return;
    }
    setIsLayering(true);
    for(let i = 0; i < layers.length; i++) {
        setStatusMsg({ text: `DECOMPONDO ELEMENTO: ${layers[i].name}`, type: 'info' });
        await new Promise(r => setTimeout(r, 600));
    }
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `VISIONOS-MASTER-${id}-MULTILAYER.psd`;
    link.click();
    setIsLayering(false);
    setStatusMsg({ text: "ARQUIVO PSD COM ELEMENTOS SEPARADOS SALVO", type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleRun = async () => {
    if (isProcessing) return;
    if (!command.trim()) {
      setStatusMsg({ text: "DIGITE AS INSTRUÇÕES DO RENDER", type: 'warning' });
      return;
    }

    setIsProcessing(true);
    setStatusMsg({ text: `INICIANDO RENDER ${modelMode.toUpperCase()}...`, type: 'info' });
    
    try {
      const data = await processImageRequest(selectedImage, command, modelMode, aspectRatio, imageSize, "", genMode);
      if (!data.error) {
        const updated: ProcessingResult = { 
          ...data, 
          folderId: activeFolderId, 
          operatorEmail: OPERATOR_EMAIL,
          timestamp: Date.now(),
          config: { aspectRatio, imageSize, mode: modelMode }
        };
        setResult(updated);
        await saveProject(updated);
        await refreshData();
        setStatusMsg({ text: "PROCESSO NEURAL CONCLUÍDO", type: 'success' });
      } else {
        setStatusMsg({ text: data.error, type: 'error' });
      }
    } catch (e: any) {
      setStatusMsg({ text: "FALHA NO SERVIDOR MASTER", type: 'error' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  return (
    <Layout 
      projects={projects} 
      folders={folders} 
      activeProjectId={result?.id} 
      activeFolderId={activeFolderId} 
      selectedBaseUrl={selectedImage}
      operatorEmail={OPERATOR_EMAIL}
      onSelectProject={(p) => { setResult(p); setSelectedImage(p.originalAlignedUrl || null); }}
      onDeleteProject={async (id) => { await deleteProject(id); refreshData(); }}
      onClearHistory={async () => { if(confirm("Limpar todo o banco Master?")) { await clearAllProjects(); refreshData(); setResult(null); } }}
      onGeneratePython={() => {}}
      onCreateFolder={async (n) => { await saveFolder({id: `F-${Date.now()}`, name: n, timestamp: Date.now()}); refreshData(); }}
      onSelectFolder={setActiveFolderId}
      onDeleteFolder={async (id) => { await deleteFolder(id); refreshData(); }}
      onMoveProject={updateProjectFolder}
    >
      <div className="max-w-[1600px] mx-auto px-6 py-10 flex flex-col min-h-full">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          
          <div className="xl:col-span-4 space-y-6">
            <div className="glass-panel p-8 rounded-[3rem] space-y-8 border-white/5 shadow-2xl bg-[#0d0d0f]/95 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#e11d48] to-transparent"></div>
              
              {/* COMPONENTE DE UPLOAD (MATRIZ) */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Matriz de Referência</span>
                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  className={`group relative p-6 border-2 border-dashed rounded-[2.5rem] transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${selectedImage ? 'border-[#e11d48] bg-[#e11d48]/5' : 'border-zinc-800 bg-black/40 hover:border-zinc-700'}`}
                >
                  {selectedImage ? (
                    <img src={selectedImage} className="w-full h-40 object-cover rounded-2xl shadow-2xl transition-transform group-hover:scale-[1.02]" />
                  ) : (
                    <div className="py-8 flex flex-col items-center">
                       <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-zinc-600 mb-4 group-hover:text-white transition-all">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                       </div>
                       <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Enviar Matriz</span>
                    </div>
                  )}
                </div>
                {selectedImage && (
                  <button onClick={() => { setSelectedImage(null); setGenMode('Create'); }} className="w-full py-2 text-[9px] font-black text-zinc-700 hover:text-red-500 uppercase tracking-widest">Remover Matriz (Modo Criação)</button>
                )}
              </div>

              {/* SELETOR DE QUALIDADE (STANDARD / PRO) */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Motor de Render</span>
                <div className="flex p-1.5 bg-black/60 rounded-2xl border border-white/5">
                  <button onClick={() => setModelMode('Standard')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${modelMode === 'Standard' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}>Standard (Fast)</button>
                  <button onClick={() => setModelMode('Pro')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${modelMode === 'Pro' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-600 hover:text-zinc-400'}`}>Master Pro (PSD)</button>
                </div>
              </div>

              {/* INPUT DE PROMPT (CRIAÇÃO OU EDIÇÃO) */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Instruções Master</span>
                <textarea 
                  value={command} onChange={e => setCommand(e.target.value)}
                  className="w-full bg-black/60 p-7 rounded-[2.5rem] text-sm outline-none border border-white/10 focus:border-[#e11d48]/40 min-h-[160px] text-white placeholder-zinc-800 transition-all font-medium leading-relaxed"
                  placeholder={selectedImage ? "O que deseja alterar na matriz?" : "Descreva a imagem que deseja criar do zero..."}
                />
              </div>

              <button 
                onClick={handleRun} 
                disabled={isProcessing} 
                className={`w-full py-8 rounded-[3rem] font-black text-xs uppercase tracking-[0.5em] shadow-2xl transition-all flex items-center justify-center gap-3 ${isProcessing ? 'bg-zinc-900 text-zinc-700' : 'bg-[#e11d48] text-white hover:scale-[1.02] active:scale-95 shadow-[0_20px_60px_rgba(225,29,72,0.3)]'}`}
              >
                {isProcessing ? 'PROCESSANDO NEURÔNIOS...' : 'EXECUTAR RENDER MASTER'}
              </button>
            </div>

            {/* PAINEL DE CAMADAS (APENAS PRO) */}
            {modelMode === 'Pro' && result?.versions[0]?.layers && (
              <div className="glass-panel p-8 rounded-[3rem] border-white/5 bg-black/40 space-y-6 animate-fade-in">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Objetos Segmentados</span>
                  <span className="text-[9px] font-bold text-[#e11d48] uppercase">{result.versions[0].layers.length} Camadas</span>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                  {result.versions[0].layers.map(layer => (
                    <div key={layer.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-[10px] font-black text-white/40">OBJ</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-white uppercase truncate">{layer.name}</p>
                        <p className="text-[8px] font-bold text-zinc-600 uppercase">{layer.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-8 space-y-8">
            <div className="aspect-video w-full bg-zinc-950 rounded-[4rem] border border-white/5 overflow-hidden shadow-2xl relative flex items-center justify-center group">
              
              {isLayering && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-3xl flex items-center justify-center">
                   <div className="absolute inset-0 border-t-2 border-[#00c6ff] animate-[layer-scan_2s_infinite]"></div>
                   <div className="text-center">
                      <p className="text-[11px] font-black text-white uppercase tracking-[1em] mb-4">Exportando Elementos PSD</p>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase">{statusMsg?.text}</p>
                   </div>
                </div>
              )}

              {result ? (
                <div className="w-full h-full relative">
                  {selectedImage && genMode === 'Edit' ? (
                    <BeforeAfterSlider before={selectedImage} after={result.versions[0].imageUrl} />
                  ) : (
                    <img src={result.versions[0].imageUrl} className="w-full h-full object-contain" />
                  )}
                  
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-5 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-6 group-hover:translate-y-0">
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = result.versions[0].imageUrl;
                        link.download = `VISIONOS-${result.id}.png`;
                        link.click();
                      }} 
                      className="px-12 py-6 bg-white text-black rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 shadow-2xl transition-all"
                    >
                      Exportar PNG
                    </button>
                    {modelMode === 'Pro' && (
                      <button 
                        onClick={() => handleSavePSD(result.versions[0].imageUrl, result.id, result.versions[0].layers)} 
                        className="px-12 py-6 bg-blue-600 text-white border border-blue-400/30 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-2xl flex items-center gap-4 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2" strokeWidth="2"/></svg>
                        Exportar PSD (Camadas)
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-20 opacity-20">
                  <div className={`w-36 h-36 border-[6px] ${isProcessing ? 'border-t-[#e11d48] animate-spin shadow-[0_0_80px_rgba(225,29,72,0.3)]' : 'border-dashed border-zinc-800'} rounded-full mx-auto mb-10`}></div>
                  <p className="text-[14px] font-black uppercase tracking-[1.5em] text-white">Pronto para o Próximo Render</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

      {statusMsg && (
        <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 px-16 py-8 rounded-[2rem] border backdrop-blur-3xl z-[1000] animate-bounce text-[10px] font-black uppercase tracking-[0.5em] shadow-2xl ${statusMsg.type === 'error' ? 'bg-red-500/20 border-red-500 text-red-500' : (statusMsg.type === 'success' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-blue-600 text-white border-white/20')}`}>
          {statusMsg.text}
        </div>
      )}

      <style>{`
        @keyframes layer-scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
      `}</style>
    </Layout>
  );
};

export default App;
