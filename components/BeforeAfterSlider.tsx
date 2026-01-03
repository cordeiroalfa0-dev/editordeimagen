
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
      className="relative w-full h-full overflow-hidden cursor-ew-resize select-none bg-black"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseDown={(e) => { e.preventDefault(); }}
    >
      <img src={after} alt="Render" className="absolute inset-0 w-full h-full object-cover" />
      
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden border-r border-[#9b1b30]/50 transition-all duration-75"
        style={{ width: `${sliderPos}%` }}
      >
        <img 
            src={before} 
            alt="Source" 
            className="absolute inset-0 w-full h-full object-cover" 
            style={{ width: `${100 / (sliderPos/100)}%`, maxWidth: 'none' }} 
        />
        <div className="absolute top-10 left-10 bg-black/60 backdrop-blur-2xl px-6 py-3 rounded-full text-[9px] font-black text-white uppercase tracking-[0.5em] border border-white/5">Original_Entrada</div>
      </div>

      <div 
        className="absolute inset-y-0 w-[2px] bg-[#9b1b30] flex items-center justify-center transition-all duration-75 shadow-[0_0_25px_rgba(155,27,48,0.8)]"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="w-12 h-12 bg-white rounded-2xl shadow-[0_0_50px_rgba(0,0,0,1)] flex items-center justify-center -ml-[1px]">
          <div className="w-5 h-[2px] bg-black rotate-90 rounded-full"></div>
          <div className="absolute w-14 h-14 border border-[#9b1b30]/30 rounded-full animate-ping opacity-20"></div>
        </div>
      </div>

      <div className="absolute top-10 right-10 bg-[#9b1b30] px-6 py-3 rounded-full text-[9px] font-black text-white uppercase tracking-[0.5em] shadow-[0_0_35px_rgba(155,27,48,0.4)]">Render_Sintetizado</div>
    </div>
  );
};
