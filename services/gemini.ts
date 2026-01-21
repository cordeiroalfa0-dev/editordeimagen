
import { GoogleGenAI, Type } from "@google/genai";
import { ProcessingResult, GeneratedVersion, AspectRatio, ImageSize, ModelMode, PSDLayer } from "../types";

export const processImageRequest = async (
  base64Image: string | null,
  command: string,
  mode: ModelMode = 'Standard',
  aspectRatio: AspectRatio = "1:1",
  imageSize: ImageSize = "1K",
  stylePreset: string = "",
  genMode: 'Edit' | 'Create' | 'Outpaint' = 'Edit'
): Promise<ProcessingResult> => {
  const requestId = `V24-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  
  // A chave API é injetada automaticamente. Se o usuário estiver no modo Standard, 
  // o Gemini 2.5 Flash Image deve funcionar sem a necessidade de uma chave paga selecionada manualmente.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const isPro = mode === 'Pro';
    const mainModel = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    const isCreation = !base64Image || genMode === 'Create';

    const mainPrompt = `RENDER: ${command}. Style: ${stylePreset || 'High-end studio photography, ultra-detailed'}.`;
    
    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio
      }
    };

    if (isPro) {
      config.imageConfig.imageSize = imageSize;
    }

    const mainResponse = await ai.models.generateContent({
      model: mainModel,
      contents: {
        parts: [
          ...(base64Image && !isCreation ? [{ inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } }] : []),
          { text: mainPrompt }
        ]
      },
      config: config
    });

    const mainPart = mainResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!mainPart?.inlineData) {
      throw new Error(mainResponse.text || "Falha na geração. O modelo não retornou dados de imagem.");
    }
    
    const mainBase64 = mainPart.inlineData.data;

    const versions: GeneratedVersion[] = [{
      id: `${requestId}-V1`,
      imageUrl: `data:image/png;base64,${mainBase64}`,
      description: command,
      style: mode,
      lighting: "Master Lighting",
      scenery: isPro ? "Advanced Composition" : "Standard Composition",
      resolution: isPro ? imageSize : "1K"
    }];

    return { 
      id: requestId, 
      versions, 
      originalAlignedUrl: base64Image || undefined,
      logs: [{ timestamp: new Date().toISOString(), message: "Imagem gerada com sucesso.", type: 'success' }], 
      timestamp: Date.now() 
    };

  } catch (error: any) {
    console.error("[VisionOS Engine Error]:", error);
    let msg = error.message || "Erro desconhecido";
    
    if (msg.includes("403")) msg = "ACESSO NEGADO: Este modelo pode exigir faturamento ativo ou chave selecionada.";
    if (msg.includes("400")) msg = "PARÂMETRO INVÁLIDO: Verifique o comando ou modo selecionado.";
    
    return { 
      id: requestId, 
      error: msg, 
      timestamp: Date.now(), 
      versions: [], 
      logs: [{ timestamp: new Date().toISOString(), message: msg, type: 'api' }] 
    };
  }
};
