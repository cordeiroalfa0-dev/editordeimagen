
import React, { useState, useRef } from 'react';

interface BeforeAfterSliderProps {
  before: string;
  after: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ before, after }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, position)));
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-square overflow-hidden cursor-ew-resize select-none border border-zinc-800 shadow-inner"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseDown={(e) => { e.preventDefault(); }} // Prevent text selection on desktop
    >
      {/* Imagem Depois */}
      <img src={after} alt="Depois" className="absolute inset-0 w-full h-full object-cover" />
      
      {/* Imagem Antes (Recortada) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden border-r-2 border-white/50 shadow-[5px_0_20px_rgba(0,0,0,0.5)] transition-all duration-75"
        style={{ width: `${sliderPos}%` }}
      >
        <img src={before} alt="Antes" className="absolute inset-0 w-full h-full object-cover" style={{ width: `${10000 / sliderPos}%`, maxWidth: 'none' }} />
        <div className="absolute top-4 left-4 md:top-8 md:left-8 bg-black/60 backdrop-blur-md px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-[10px] font-black text-white uppercase tracking-[0.2em] border border-white/10">Original</div>
      </div>

      {/* Alça do Slider */}
      <div 
        className="absolute inset-y-0 w-1 bg-white flex items-center justify-center transition-all duration-75"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-center -ml-[3.5px] md:-ml-[4.5px]">
          <svg className="w-4 h-4 md:w-6 md:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 12h8m-8 0l4-4m-4 4l4 4" />
          </svg>
        </div>
      </div>

      <div className="absolute top-4 right-4 md:top-8 md:right-8 bg-indigo-500/90 backdrop-blur-md px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg">Studio v2.5</div>
    </div>
  );
};
