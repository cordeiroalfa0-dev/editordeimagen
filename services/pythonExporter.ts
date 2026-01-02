
export const generatePythonScript = (apiKey: string, lastCommand: string) => {
  return `
import os
import sys
import subprocess
import base64
import json
import time
from pathlib import Path

def install_dependencies():
    libs = ["google-generativeai", "Pillow", "opencv-python", "tqdm", "numpy"]
    print("[SYSTEM] Calibrando motores para Texturas e Texto (Tattoo)...")
    for lib in libs:
        try:
            __import__(lib.replace("-", "_"))
        except ImportError:
            subprocess.check_call([sys.executable, "-m", "pip", "install", lib, "--quiet"])

install_dependencies()

import google.generativeai as genai
import cv2
import numpy as np
from PIL import Image
from tqdm import tqdm

API_KEY = "${apiKey || 'SUA_CHAVE_AQUI'}"
genai.configure(api_key=API_KEY)

class DetailRecoveryEngine:
    @staticmethod
    def process_precision(img_path):
        """Foca em manter o texto da tatuagem legível e a areia nítida"""
        img = cv2.imread(str(img_path))
        if img is None: return
        
        # 1. Super-Resolução Seletiva
        h, w = img.shape[:2]
        img = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)
        
        # 2. Local Contrast Enhancement (LAB)
        # Melhora a visibilidade do texto da tatuagem e do coração vermelho
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4,4))
        l = clahe.apply(l)
        enhanced = cv2.cvtColor(cv2.merge((l,a,b)), cv2.COLOR_LAB2BGR)
        
        # 3. Micro-Sharpening (Filtro passa-alta para grãos de areia)
        gaussian = cv2.GaussianBlur(enhanced, (0, 0), 2)
        sharpened = cv2.addWeighted(enhanced, 1.8, gaussian, -0.8, 0)
        
        out_name = img_path.parent / f"PRECISION_RENDER_{img_path.name}"
        cv2.imwrite(str(out_name), sharpened)

class VisionMaster:
    def __init__(self, command):
        self.command = command
        self.model = genai.GenerativeModel('gemini-3-pro-image-preview')
        
    def run(self, img_p):
        img_in = Image.open(img_p)
        # Instrução de força bruta para a IA não ignorar os detalhes
        prompt = f"""
        ACT AS A PROFESSIONAL PHOTOREALISTIC ENGINE.
        SCENE: {self.command}.
        MANDATORY: 
        1. No upper clothing (topless).
        2. Rear view.
        3. Clear visible black tattoo with text 'Emerson' and a red heart.
        4. Realistic sand particles on buttocks and hands.
        5. Ultra-thin string bikini.
        8k, sharp focus, editorial quality.
        """
        
        res = self.model.generate_content([img_in, prompt])
        out_dir = Path("outputs")
        out_dir.mkdir(exist_ok=True)
        
        for part in res.candidates[0].content.parts:
            if part.inlineData:
                tmp = out_dir / f"BASE_{img_p.stem}.png"
                with open(tmp, "wb") as f:
                    f.write(base64.b64decode(part.inlineData.data))
                
                print(f"\\n[PYTHON] Executando Pós-Processamento de Alta Precisão em {img_p.name}...")
                DetailRecoveryEngine.process_precision(tmp)
                if os.path.exists(tmp): os.remove(tmp)

if __name__ == "__main__":
    print("[SYSTEM] Precision Vision Master Online.")
    engine = VisionMaster("${lastCommand}")
    files = [Path(f) for f in os.listdir('.') if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    for f in tqdm(files, desc="Rendering Details"):
        try:
            engine.run(f)
            time.sleep(2)
        except Exception as e:
            print(f"Erro: {e}")
`;
};
