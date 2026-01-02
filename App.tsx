
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
  const [msg, setMsg] = useState<string | null>(null);
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
    setMsg(null);
    try {
      const data = await processImageRequest(selectedImage, command);
      await saveProject(data);
      setResult(data);
      setProjects(await getAllProjects());
    } catch (e: any) {
      setMsg(e.message);
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
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-black italic tracking-tighter">VISION MASTER</h1>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.6em]">Edição Instantânea sem Configuração</p>
        </header>

        {msg && (
          <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl text-center">
            <p className="text-[10px] font-black uppercase text-indigo-400">{msg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* LADO A: INPUT */}
          <div className="space-y-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-white/5 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-zinc-900 transition-all"
            >
              {selectedImage ? (
                <img src={selectedImage} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-black uppercase opacity-20">Clique para Abrir Foto</span>
              )}
              <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" />
            </div>

            <textarea 
              value={command}
              onChange={e => setCommand(e.target.value)}
              className="w-full bg-zinc-900/80 border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-indigo-500/50 min-h-[100px]"
              placeholder="O que você quer mudar? (Ex: Deixe ela em pé...)"
            />

            <button 
              onClick={handleRun}
              disabled={isProcessing || !selectedImage}
              className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all ${isProcessing ? 'bg-zinc-800 text-zinc-600' : 'bg-white text-black hover:bg-indigo-500 hover:text-white'}`}
            >
              {isProcessing ? 'PROCESSANDO...' : 'EXECUTAR AGORA'}
            </button>
          </div>

          {/* LADO B: RESULTADO */}
          <div className="space-y-6">
            {isProcessing ? (
              <div className="aspect-square bg-zinc-900/20 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Recriando Geometria...</p>
              </div>
            ) : result ? (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex gap-2">
                  <button onClick={() => setViewMode(ViewMode.GALLERY)} className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase ${viewMode === ViewMode.GALLERY ? 'bg-zinc-800' : 'text-zinc-600'}`}>Versões</button>
                  <button onClick={() => setViewMode(ViewMode.COMPARISON)} className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase ${viewMode === ViewMode.COMPARISON ? 'bg-zinc-800' : 'text-zinc-600'}`}>Comparar</button>
                </div>
                {viewMode === ViewMode.GALLERY ? (
                  <div className="space-y-4">
                    {result.versions.map(v => (
                      <div key={v.id} className="rounded-3xl overflow-hidden border border-white/5 group relative">
                        <img src={v.imageUrl} className="w-full h-full object-cover"