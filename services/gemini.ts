
import { GoogleGenAI } from "@google/genai";
import { ProcessingResult, GeneratedVersion, AspectRatio, ImageSize, ModelMode } from "../types";

export const processImageRequest = async (
  base64Image: string,
  command: string,
  mode: ModelMode = 'Standard',
  aspectRatio: AspectRatio = "1:1",
  imageSize: ImageSize = "1K"
): Promise<ProcessingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Seleção dinâmica do modelo com base no modo
  const modelName = mode === 'Pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  const requestId = `V${mode.substring(0, 1)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const promptText = mode === 'Pro' 
    ? `[VFX_PRO_PIPELINE]: Master high-fidelity edit. COMMAND: "${command}". Focus on complex mesh reconstruction and anatomical freedom.`
    : `[VFX_STANDARD]: Quick edit. COMMAND: "${command}". Focus on style and color consistency.`;

  try {
    const config: any = {
      imageConfig: {
        aspectRatio,
        // ImageSize 2K/4K só é suportado no modo Pro
        imageSize: mode === 'Pro' ? imageSize : "1K"
      }
    };

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
          { text: promptText }
        ]
      },
      config
    });

    const versions: GeneratedVersion[] = [];
    
    if (response.candidates) {
      for (const candidate of response.candidates) {
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              versions.push({
                id: `${requestId}-V${versions.length + 1}`,
                imageUrl: `data:image/png;base64,${part.inlineData.data}`,
                description: `Render [${mode}]: ${command}`,
                style: mode === 'Pro' ? "CGI High-End" : "Flash Stream",
                lighting: "Neural Ray-traced",
                scenery: "Generated",
                resolution: mode === 'Pro' ? imageSize : "1K"
              });
            }
          }
        }
      }
    }

    if (versions.length === 0) {
      if (response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error("REQUISIÇÃO BLOQUEADA: Use termos mais técnicos para descrever a modificação.");
      }
      throw new Error("O motor não gerou pixels. Tente novamente.");
    }

    return {
      id: requestId,
      analysis: `Processamento via ${mode} concluído.`,
      confirmation: "Sucesso",
      versions,
      originalAlignedUrl: base64Image,
      logs: [],
      timestamp: Date.now(),
      config: { aspectRatio, imageSize, mode }
    };

  } catch (error: any) {
    if (error.message?.includes("not found") || error.message?.includes("key")) {
      throw new Error("KEY_ERROR: Falha na validação da chave de API.");
    }
    throw new Error(error.message || "Erro no pipeline de renderização.");
  }
};
