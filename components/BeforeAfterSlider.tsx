
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
    
    // Performance: Usa requestAnimationFrame implicitamente apenas atualizando o estado
    setSliderPos(Math.max(0, Math.min(100, position)));
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-ew-resize select-none bg-black group"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      <img src={after} alt="After" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden border-r-2 border-[#e11d48] will-change-[width]"
        style={{ width: `${sliderPos}%` }}
      >
        <img 
            src={before} 
            alt="Before" 
            className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
            style={{ width: `${100 / (sliderPos/100)}%`, maxWidth: 'none' }} 
        />
        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded text-[8px] font-bold text-white uppercase tracking-widest">ORIGINAL</div>
      </div>

      <div 
        className="absolute inset-y-0 w-[2px] bg-[#e11d48] flex items-center justify-center will-change-[left]"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="w-6 h-6 bg-white rounded-lg shadow-xl flex items-center justify-center -ml-[1px]">
          <div className="w-3 h-0.5 bg-black rotate-90 rounded-full"></div>
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-[#e11d48] px-3 py-1 rounded text-[8px] font-bold text-white uppercase tracking-widest">RENDER</div>
    </div>
  );
};
