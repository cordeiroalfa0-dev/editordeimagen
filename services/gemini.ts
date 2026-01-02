
import { GoogleGenAI } from "@google/genai";
import { ProcessingResult, GeneratedVersion, SystemLog } from "../types";

export const processImageRequest = async (
  base64Image: string,
  command: string,
  numVersions: number = 3,
  isProMode: boolean = false,
  resolution: "1K" | "2K" | "4K" = "1K",
  useGrounding: boolean = false
): Promise<ProcessingResult> => {
  // Instanciar o SDK no momento da chamada para garantir o uso da chave atual do ambiente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const modelName = (isProMode || useGrounding) ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  const requestId = `PRJ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const logs: SystemLog[] = [
    { timestamp: new Date().toLocaleTimeString(), message: `Pipeline Master Ativo: ${requestId}`, type: 'info' },
    { timestamp: new Date().toLocaleTimeString(), message: `Modelo: ${modelName}`, type: 'telemetry' }
  ];
  
  // 1. ANÁLISE TÉCNICA (Gera prompts seguros e profissionais)
  let artDirection: any = {};
  try {
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
          { text: `Aja como um Diretor de Fotografia de Moda de alto padrão. 
                   O usuário deseja: "${command}". 
                   Analise a imagem e crie ${numVersions} variações técnicas.
                   FOQUE EM: Iluminação, composição, texturas e estilo editorial. 
                   EVITE: Termos descritivos sensíveis. Use linguagem de estúdio profissional.
                   Retorne APENAS JSON: { "analise": "breve análise", "promptsFisicos": ["prompt1", "prompt2", "prompt3"], "descricoes": ["desc1", "desc2", "desc3"] }` }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    artDirection = JSON.parse(analysisResponse.text || "{}");
  } catch (e: any) {
    artDirection = { 
      analise: "Modo de compatibilidade ativado.",
      promptsFisicos: Array(numVersions).fill(command),
      descricoes: Array(numVersions).fill("Edição direta solicitada.")
    };
  }

  const versions: GeneratedVersion[] = [];

  // 2. RENDERIZAÇÃO
  for (let i = 0; i < numVersions; i++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
            { text: `HIGH-END PROFESSIONAL EDITORIAL PHOTOGRAPHY. ${artDirection.promptsFisicos[i]}. Cinematic lighting, 8k resolution, flawless textures, sharp focus, fashion magazine style.` }
          ]
        },
        config: { 
          imageConfig: { 
            aspectRatio: "1:1", 
            ...((modelName === 'gemini-3-pro-image-preview') && { imageSize: resolution })
          }
        }
      });

      const candidate = response.candidates?.[0];
      
      if (candidate?.finishReason === 'SAFETY') {
        logs.push({ timestamp: new Date().toLocaleTimeString(), message: `Variação ${i+1} bloqueada por segurança.`, type: 'warning' });
        continue;
      }

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            versions.push({
              id: `${requestId}-V${i+1}`,
              imageUrl: `data:image/png;base64,${part.inlineData.data}`,
              description: artDirection.descricoes[i] || "Variação profissional.",
              style: "Editorial Pro",
              lighting: "Studio Master",
              scenery: "Dynamic",
              resolution: (modelName === 'gemini-3-pro-image-preview') ? resolution : "1K"
            });
          }
        }
      }
    } catch (err: any) {
      console.error(`Erro na variante ${i+1}:`, err);
    }
  }

  if (versions.length === 0) {
    throw new Error("Não foi possível gerar as imagens. Tente um comando mais específico.");
  }

  return {
    id: requestId,
    analysis: artDirection.analise || "Processamento concluído",
    confirmation: "Sucesso",
    versions,
    originalAlignedUrl: base64Image,
    logs,
    timestamp: Date.now()
  };
};
