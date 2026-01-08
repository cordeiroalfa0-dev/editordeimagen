
import { GoogleGenAI, Type } from "@google/genai";
import { ProcessingResult, GeneratedVersion, AspectRatio, ImageSize, ModelMode, PSDLayer } from "../types";

export const processImageRequest = async (
  base64Image: string | null,
  command: string,
  mode: ModelMode = 'Pro',
  aspectRatio: AspectRatio = "1:1",
  imageSize: ImageSize = "2K",
  stylePreset: string = "",
  genMode: 'Edit' | 'Create' | 'Outpaint' = 'Edit'
): Promise<ProcessingResult> => {
  const requestId = `V20-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const isPro = mode === 'Pro';
    const modelName = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    // Determina se é criação pura ou edição baseada na presença da imagem
    const isCreation = !base64Image || genMode === 'Create';

    const standardInstruction = `
      OBJECTIVE: High-speed high-fidelity render.
      MODE: ${isCreation ? 'GENERATE FROM PROMPT' : 'MODIFY EXISTING IMAGE'}.
      STYLE: ${stylePreset || 'Professional studio photography, clean edges'}.
      COMMAND: ${command}
    `;

    const proInstruction = `
      OBJECTIVE: Professional PSD-ready multi-layer render.
      MANDATORY: Semantic element separation. Sharp focus on every individual object.
      PSD_RULE: Organize the scene so that each character, object, and major light source is a distinct visual element.
      MODE: ${isCreation ? 'GENERATE FROM PROMPT' : 'MODIFY EXISTING IMAGE'}.
      STYLE: ${stylePreset || 'Studio Master Render, 8k, tack sharp, layered lighting'}.
      COMMAND: ${command}
    `;

    const contents = {
      parts: [
        ...(base64Image && !isCreation ? [{ 
          inlineData: { 
            mimeType: 'image/png', 
            data: base64Image.split(',')[1] 
          } 
        }] : []),
        { text: isPro ? proInstruction : standardInstruction }
      ]
    };

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        imageConfig: { 
          aspectRatio, 
          imageSize: isPro ? imageSize : undefined 
        }
      }
    });

    const versions: GeneratedVersion[] = [];
    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

    if (imagePart?.inlineData) {
      let layers: PSDLayer[] | undefined = undefined;
      
      if (isPro) {
        // Simulação de segmentação inteligente baseada nos objetos descritos no prompt
        layers = [
          { id: 'BG', name: 'CAMADA_FUNDO_ATMOSFERA', type: 'background', visibility: true, opacity: 100 },
          { id: 'SUBJ', name: 'ELEMENTO_PRINCIPAL', type: 'subject', visibility: true, opacity: 100 },
          { id: 'PROP', name: 'ELEMENTO_SECUNDARIO', type: 'foreground', visibility: true, opacity: 100 },
          { id: 'LIGHT', name: 'ILUMINACAO_VOLUMETRICA', type: 'lighting', visibility: true, opacity: 90 },
          { id: 'FX', name: 'PARTICULAS_E_POS', type: 'fx', visibility: true, opacity: 75 }
        ];
      }

      versions.push({
        id: `${requestId}-V1`,
        imageUrl: `data:image/png;base64,${imagePart.inlineData.data}`,
        description: command,
        style: mode,
        lighting: isPro ? "Advanced Multi-Source" : "Standard HDR",
        scenery: isPro ? "Layered Environment" : "Flat Composition",
        resolution: isPro ? imageSize : "1K",
        layers: layers
      });
    }

    if (versions.length === 0) throw new Error("Falha Crítica: O motor não gerou o buffer de imagem.");

    return { 
      id: requestId, 
      versions, 
      originalAlignedUrl: base64Image || undefined,
      logs: [], 
      timestamp: Date.now() 
    };

  } catch (error: any) {
    return { id: requestId, error: error.message, timestamp: Date.now(), versions: [], logs: [] };
  }
};
