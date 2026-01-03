
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
        className="absolute inset-0 w-full h-full overflow-hidden border-r-4 border-[#e11d48] transition-none shadow-[20px_0_40px_rgba(0,0,0,0.5)]"
        style={{ width: `${sliderPos}%` }}
      >
        <img 
            src={before} 
            alt="Original" 
            className="absolute inset-0 w-full h-full object-cover" 
            style={{ width: `${100 / (sliderPos/100)}%`, maxWidth: 'none' }} 
        />
        <div className="absolute top-12 left-12 bg-black/90 backdrop-blur-3xl px-12 py-5 rounded-[2rem] text-lg font-black text-white uppercase tracking-[0.4em] border-2 border-white/10 shadow-[0_0_50px_rgba(0,0,0,1)]">ORIGINAL</div>
      </div>

      <div 
        className="absolute inset-y-0 w-[6px] bg-[#e11d48] flex items-center justify-center transition-none shadow-[0_0_50px_rgba(225,29,72,1)]"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="w-20 h-20 bg-white rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,1)] flex items-center justify-center -ml-[3px] group active:scale-125 transition-all">
          <div className="w-10 h-[4px] bg-black rotate-90 rounded-full"></div>
        </div>
      </div>

      <div className="absolute top-12 right-12 bg-[#e11d48] px-12 py-5 rounded-[2rem] text-lg font-black text-white uppercase tracking-[0.4em] shadow-[0_0_60px_rgba(225,29,72,0.6)] border-2 border-[#fb7185]/30">IA_RENDER</div>
    </div>
  );
};
