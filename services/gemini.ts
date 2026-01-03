
import { GoogleGenAI } from "@google/genai";
import { ProcessingResult, GeneratedVersion, AspectRatio, ImageSize, ModelMode } from "../types";

export const processImageRequest = async (
  base64Image: string | null,
  command: string,
  mode: ModelMode = 'Standard',
  aspectRatio: AspectRatio = "1:1",
  imageSize: ImageSize = "1K"
): Promise<ProcessingResult> => {
  const requestId = `V-OS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  
  try {
    // MANDATORY: Create instance inside call for up-to-date API keys
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const isPro = mode === 'Pro';
    const modelName = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

    const isCreation = !base64Image;

    const finalPrompt = `
      High-end professional CGI render: ${command}. 
      Hyper-realistic photography, cinematic atmosphere, studio lighting, 8k details. 
      No text, no watermarks.
    `.trim();

    const imageConfig: any = { 
      aspectRatio,
      ...(isPro ? { imageSize } : {})
    };

    const contentsParts: any[] = [];
    if (base64Image) {
      contentsParts.push({ 
        inlineData: { 
          mimeType: 'image/png', 
          data: base64Image.split(',')[1] 
        } 
      });
    }
    contentsParts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: contentsParts },
      config: { imageConfig }
    });

    if (!response || !response.candidates || response.candidates.length === 0) {
       throw new Error("Resposta vazia da IA.");
    }

    const candidate = response.candidates[0];

    // Tratamento de segurança e erros de rede
    if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
      const reasons: Record<string, string> = {
        'SAFETY': "CONTEÚDO BLOQUEADO: Comando disparou filtros de segurança.",
        'RECITATION': "COPYRIGHT: Conteúdo protegido detectado.",
        'IMAGE_OTHER': "ERRO DE MOTOR: Falha na síntese de imagem.",
      };
      return { id: requestId, error: reasons[candidate.finishReason] || candidate.finishReason, timestamp: Date.now(), versions: [], logs: [] } as ProcessingResult;
    }

    const versions: GeneratedVersion[] = [];
    const parts = candidate.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData) {
        versions.push({
          id: `${requestId}-V1`,
          imageUrl: `data:image/png;base64,${part.inlineData.data}`,
          description: command,
          style: "Realism",
          lighting: "Cinematic",
          scenery: isCreation ? "Generated" : "Transformed",
          resolution: isPro ? imageSize : "HD"
        });
      }
    }

    if (versions.length === 0) {
      return { id: requestId, error: "A IA processou o pedido mas não gerou pixels. Tente mudar o comando.", timestamp: Date.now(), versions: [], logs: [] } as ProcessingResult;
    }

    return {
      id: requestId,
      analysis: "OK",
      confirmation: "RENDER_COMPLETE",
      versions,
      originalAlignedUrl: base64Image || undefined,
      logs: [{ timestamp: new Date().toISOString(), message: "Render Success", type: 'success' }],
      timestamp: Date.now(),
      config: { aspectRatio, imageSize, mode }
    };

  } catch (error: any) {
    const msg = error.message || "Unknown error";
    return { id: requestId, error: msg, timestamp: Date.now(), versions: [], logs: [] } as ProcessingResult;
  }
};
