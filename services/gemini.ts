
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
  const requestId = `V19-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const isPro = mode === 'Pro';
    const modelName = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    // Instrução condicional baseada no modo selecionado
    const standardInstruction = `
      OBJECTIVE: High-quality image generation. Focus on visual fidelity and speed.
      STYLE: ${stylePreset || 'High-end studio photography, clean, sharp'}.
      COMMAND: ${command}
      ${genMode === 'Create' ? 'Generate a new image.' : 'Modify the base image precisely according to instructions.'}
    `;

    const proInstruction = `
      OBJECTIVE: Professional High-Fidelity Image for PSD layering.
      MANDATORY: Semantic element separation. Sharp edges for each individual object.
      PSD_RULE: Organize the composition so that every main element (subject, background, lighting) is isolated.
      STYLE: ${stylePreset || 'Studio Master Render, 8k resolution, tack sharp edges'}.
      COMMAND: ${command}
      ${genMode === 'Create' ? 'Generate a new scene with separate-able elements.' : 'Modify base image with element-level isolation for layers.'}
    `;

    const contents = {
      parts: [
        ...(base64Image && genMode !== 'Create' ? [{ 
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
      // Camadas apenas se for modo Pro
      let layers: PSDLayer[] | undefined = undefined;
      
      if (isPro) {
        layers = [
          { id: 'BG', name: 'BASE_BACKGROUND', type: 'background', visibility: true, opacity: 100 },
          { id: 'OBJ1', name: 'MAIN_ELEMENT', type: 'subject', visibility: true, opacity: 100 },
          { id: 'OBJ2', name: 'SUPPORT_ELEMENT', type: 'foreground', visibility: true, opacity: 100 },
          { id: 'FX', name: 'ATMOSPHERE_FX', type: 'fx', visibility: true, opacity: 80 },
          { id: 'LGT', name: 'GLOBAL_LIGHTING', type: 'lighting', visibility: true, opacity: 100 }
        ];
      }

      versions.push({
        id: `${requestId}-V1`,
        imageUrl: `data:image/png;base64,${imagePart.inlineData.data}`,
        description: command,
        style: mode,
        lighting: isPro ? "Advanced Layering" : "Standard Master",
        scenery: isPro ? "Atomic Separation" : "Direct Composition",
        resolution: isPro ? imageSize : "1K",
        layers: layers
      });
    }

    if (versions.length === 0) throw new Error("Motor não retornou imagem.");

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
