
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
    print("[SYSTEM] Calibrando dependências para processamento visual...")
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

class StudioPrecisionEngine:
    @staticmethod
    def post_process(img_path):
        """Aprimora nitidez e contraste da imagem gerada"""
        img = cv2.imread(str(img_path))
        if img is None: return
        
        # LAB Color Enhancement
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        enhanced = cv2.cvtColor(cv2.merge((l,a,b)), cv2.COLOR_LAB2BGR)
        
        # Micro-Sharpening
        gaussian = cv2.GaussianBlur(enhanced, (0, 0), 3)
        sharpened = cv2.addWeighted(enhanced, 1.5, gaussian, -0.5, 0)
        
        out_name = img_path.parent / f"RENDERED_{img_path.name}"
        cv2.imwrite(str(out_name), sharpened)

class VisionMaster:
    def __init__(self, command):
        self.command = command
        # Usando o modelo Pro para máxima qualidade no export
        self.model = genai.GenerativeModel('gemini-3-pro-image-preview')
        
    def run(self, img_p):
        img_in = Image.open(img_p)
        prompt = f"EDITORIAL PROFESSIONAL PHOTOGRAPHY. SCENE: {self.command}. 8k resolution, cinematic lighting, sharp focus, high contrast."
        
        try:
            res = self.model.generate_content([img_in, prompt])
            out_dir = Path("outputs")
            out_dir.mkdir(exist_ok=True)
            
            for part in res.candidates[0].content.parts:
                if part.inlineData:
                    tmp = out_dir / f"BASE_{img_p.stem}.png"
                    with open(tmp, "wb") as f:
                        f.write(base64.b64decode(part.inlineData.data))
                    
                    print(f"\\n[PYTHON] Aplicando pós-processamento em {img_p.name}...")
                    StudioPrecisionEngine.post_process(tmp)
                    if os.path.exists(tmp): os.remove(tmp)
        except Exception as e:
            print(f"Erro ao processar {img_p.name}: {e}")

if __name__ == "__main__":
    print("[SYSTEM] StudioMaster Python Bridge Ativo.")
    engine = VisionMaster("${lastCommand}")
    files = [Path(f) for f in os.listdir('.') if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    if not files:
        print("Nenhuma imagem encontrada no diretório atual.")
        sys.exit()

    for f in tqdm(files, desc="Processando Visão"):
        engine.run(f)
        time.sleep(1)
`;
};
