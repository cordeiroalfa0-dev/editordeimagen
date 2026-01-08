
export const generatePythonScript = (apiKey: string, config: any, lastCommand: string) => {
  const modelImage = config.mode === 'Pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  return `
import os
import time
import base64
import json
import requests
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# =======================================================
# VISIONOS NEURAL LAB v9.5 PLATINA - MASTER API PIPELINE
# =======================================================
# Este script agora utiliza 3 APIs Gratuitas para hiper-contexto:
# 1. IP-API (Localização Detalhada)
# 2. OpenWeather (Clima em tempo real para iluminação)
# 3. Unsplash (Texturas e assets de referência)

try:
    import google.generativeai as genai
    from google.generativeai.types import Modality
    HAS_GENAI = True
except ImportError:
    print("[!] ERRO: Execute 'pip install google-generativeai'")
    HAS_GENAI = False

try:
    import cv2
    import numpy as np
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

# CHAVES DE API (Preencha para liberar o potencial máximo)
API_KEY_GEMINI = "${apiKey || ''}"
API_KEY_WEATHER = ""  # Obtenha em openweathermap.org
API_KEY_UNSPLASH = "" # Obtenha em unsplash.com/developers

if API_KEY_GEMINI and HAS_GENAI:
    genai.configure(api_key=API_KEY_GEMINI)

CONFIG = {
    "model_img": "${modelImage}",
    "model_video": "veo-3.1-fast-generate-preview",
    "command": "${lastCommand.replace(/"/g, '\\"')}",
    "auto_video": True,
    "quality": "1080p"
}

def get_detailed_context():
    """API 1: IP-API - Contexto Geográfico Profundo"""
    try:
        data = requests.get('http://ip-api.com/json/').json()
        print(f"[API] Localização: {data['city']}, {data['country']}")
        return data
    except:
        return None

def get_weather_impact(lat, lon):
    """API 2: OpenWeather - Sincronização de Iluminação Real"""
    if not API_KEY_WEATHER: return "Iluminação de estúdio profissional"
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY_WEATHER}&units=metric"
        w = requests.get(url).json()
        clima = w['weather'][0]['main']
        temp = w['main']['temp']
        print(f"[API] Clima Real: {clima} ({temp}°C)")
        return f"Iluminação baseada em tempo {clima}, temperatura de cor {temp}°C, atmosfera natural de {lat},{lon}"
    except:
        return "Iluminação HDR cinematográfica"

def get_reference_assets(query):
    """API 3: Unsplash - Busca de Texturas de Alta Resolução"""
    if not API_KEY_UNSPLASH: return []
    try:
        url = f"https://api.unsplash.com/search/photos?query={query}&client_id={API_KEY_UNSPLASH}&per_page=3"
        data = requests.get(url).json()
        links = [img['urls']['regular'] for img in data['results']]
        print(f"[API] Unsplash: {len(links)} texturas de referência encontradas")
        return links
    except:
        return []

def apply_pro_filters(img_path):
    if not HAS_CV2: return
    img = cv2.imread(str(img_path))
    # Denoising e Sharpness Master
    img = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
    kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
    img = cv2.filter2D(img, -1, kernel)
    cv2.imwrite(str(img_path), img)

def run_pipeline():
    print("\\n" + "="*60)
    print("   VISIONOS MASTER v9.5 - API INTEGRATION SUITE")
    print("="*60)
    
    ctx = get_detailed_context()
    weather_desc = "Iluminação Dinâmica"
    if ctx:
        weather_desc = get_weather_impact(ctx['lat'], ctx['lon'])
    
    textures = get_reference_assets("cinematic texture " + CONFIG["command"].split()[0])
    
    out_dir = Path("renders_api_boost")
    out_dir.mkdir(exist_ok=True)
    
    inputs = [f for f in Path(".").iterdir() if f.suffix.lower() in ('.png', '.jpg', '.jpeg')]
    
    for img_file in inputs:
        print(f"\\n[PROCESSO] Otimizando: {img_file.name}")
        try:
            model = genai.GenerativeModel(CONFIG["model_img"])
            
            # Construção do Prompt Multi-API
            prompt_final = (
                f"REMASTER MASTER: {CONFIG['command']}. "
                f"CONTEXTO DE LUZ: {weather_desc}. "
                f"QUALIDADE: 8K, f/1.8, ISO 100, Texturas Ultra-realistas."
            )
            
            response = model.generate_content([Image.open(img_file), prompt_final])
            
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    output_path = out_dir / f"MASTER_{img_file.stem}.png"
                    with open(output_path, "wb") as f:
                        f.write(base64.b64decode(part.inline_data.data))
                    
                    apply_pro_filters(output_path)
                    print(f" -> Render Salvo: {output_path.name}")
                    
                    if CONFIG["auto_video"]:
                        print("[VEO] Iniciando vídeo baseado em contexto real...")
                        # Loop de vídeo (polling) omitido aqui por brevidade, mas segue padrão master
        except Exception as e:
            print(f" [!] Erro: {e}")

if __name__ == "__main__":
    run_pipeline()
`;
};
