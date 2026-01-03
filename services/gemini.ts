
import { GoogleGenAI } from "@google/genai";
import { ProcessingResult, GeneratedVersion, AspectRatio, ImageSize, ModelMode } from "../types";

export const processImageRequest = async (
  base64Image: string | null,
  command: string,
  mode: ModelMode = 'Standard',
  aspectRatio: AspectRatio = "1:1",
  imageSize: ImageSize = "1K"
): Promise<ProcessingResult> => {
  const requestId = `VISION-VFX-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const isPro = mode === 'Pro';
    const modelName = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

    const isCreation = !base64Image;

    // Prompt otimizado para evitar erros internos de interpretação (IMAGE_OTHER)
    // Focamos em descrições visuais puras, removendo metadados desnecessários
    const finalPrompt = `
      Professional CGI render: ${command}. 
      Cinematic lighting, hyper-realistic textures, 8k resolution, depth of field. 
      Ensure anatomical accuracy and high-end studio quality.
      Do not include text or watermarks in the image.
    `.trim();

    const imageConfig: any = { 
      aspectRatio,
      // Garante que o tamanho da imagem seja enviado apenas se suportado (Pro)
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
      contents: {
        parts: contentsParts
      },
      config: {
        imageConfig
      }
    });

    if (!response || !response.candidates || response.candidates.length === 0) {
       throw new Error("A IA não retornou resultados. Verifique sua conexão.");
    }

    const candidate = response.candidates[0];

    // Tratamento estendido de motivos de parada para capturar IMAGE_OTHER
    if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
      const reasons: Record<string, string> = {
        'SAFETY': "CONTEÚDO BLOQUEADO: O comando disparou os filtros de segurança automática.",
        'RECITATION': "REGRAS DE COPYRIGHT: A imagem solicitada assemelha-se a conteúdo protegido.",
        'IMAGE_OTHER': "ERRO DE MOTOR: Falha interna no gerador de pixels. Tente simplificar o comando ou mudar o formato.",
        'OTHER': "ERRO DESCONHECIDO: O motor de IA parou inesperadamente. Tente novamente em instantes.",
      };
      
      return { 
        id: requestId, 
        error: reasons[candidate.finishReason] || `FALHA TÉCNICA (${candidate.finishReason}): Tente reformular sua ideia.`,
        timestamp: Date.now(),
        versions: [],
        logs: []
      } as ProcessingResult;
    }

    const versions: GeneratedVersion[] = [];
    let feedbackText = "";

    // Verificação de segurança adicional para evitar erro de leitura de undefined
    const parts = candidate.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData) {
        versions.push({
          id: `${requestId}-V1`,
          imageUrl: `data:image/png;base64,${part.inlineData.data}`,
          description: command,
          style: "Hyper-realistic",
          lighting: "Cinematic",
          scenery: isCreation ? "Generated" : "Transformed",
          resolution: isPro ? imageSize : "HD"
        });
      } else if (part.text) {
        feedbackText += part.text;
      }
    }

    if (versions.length === 0) {
      return { 
        id: requestId, 
        error: feedbackText || "O motor processou a requisição mas não conseguiu renderizar a imagem.", 
        timestamp: Date.now(),
        versions: [],
        logs: []
      } as ProcessingResult;
    }

    return {
      id: requestId,
      analysis: isCreation ? "Sintetizado" : "Editado",
      confirmation: "OK",
      versions,
      originalAlignedUrl: base64Image || undefined,
      logs: [{ timestamp: new Date().toISOString(), message: "Render Success", type: 'success' }],
      timestamp: Date.now(),
      config: { aspectRatio, imageSize, mode }
    };

  } catch (error: any) {
    const msg = error.message || "";
    // MANDATORY: If the request fails with this specific message, prompt for API key selection again for Pro models.
    if (msg.includes("Requested entity was not found.") && mode === 'Pro') {
      if ((window as any).aistudio?.openSelectKey) {
        (window as any).aistudio.openSelectKey();
      }
    }
    return { 
      id: requestId, 
      error: `FALHA NO SISTEMA: ${msg.substring(0, 120)}`, 
      timestamp: Date.now(),
      versions: [],
      logs: []
    } as ProcessingResult;
  }
};
