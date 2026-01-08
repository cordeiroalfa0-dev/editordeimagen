
import React, { useState, useRef, useCallback } from 'react';

interface BeforeAfterSliderProps {
  before: string;
  after: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ before, after }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    
    setSliderPos(Math.max(0, Math.min(100, position)));
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-ew-resize select-none bg-black group"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      {/* IMAGEM DEPOIS (FUNDO) */}
      <img src={after} alt="After" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
      
      {/* IMAGEM ANTES (OVERLAY CORTADO) */}
      <div 
        className="absolute inset-0 h-full overflow-hidden border-r-2 border-[#e11d48] transition-[width] duration-75 ease-out"
        style={{ width: `${sliderPos}%` }}
      >
        <img 
            src={before} 
            alt="Before" 
            className="absolute top-0 left-0 w-screen h-screen object-contain pointer-events-none" 
            style={{ width: containerRef.current?.offsetWidth || '100vw', height: containerRef.current?.offsetHeight || '100vh', maxWidth: 'none' }} 
        />
        <div className="absolute top-10 left-10 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full text-[9px] font-black text-white uppercase tracking-[0.5em] border border-white/10 opacity-40 group-hover:opacity-100 transition-opacity">MATRIZ_ORIGINAL</div>
      </div>

      {/* LINHA DO SLIDER */}
      <div 
        className="absolute inset-y-0 w-[2px] bg-[#e11d48] flex items-center justify-center shadow-[0_0_15px_#e11d48]"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="w-10 h-10 bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center -ml-[1px] hover:scale-110 transition-transform">
          <div className="w-4 h-0.5 bg-black rotate-90 rounded-full"></div>
        </div>
      </div>

      <div className="absolute top-10 right-10 bg-[#e11d48] px-5 py-2 rounded-full text-[9px] font-black text-white uppercase tracking-[0.5em] shadow-xl border border-white/20 opacity-40 group-hover:opacity-100 transition-opacity">RENDER_FINALIZADO</div>
    </div>
  );
};
