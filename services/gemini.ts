
import { GoogleGenAI } from "@google/genai";
import { ProcessingResult, GeneratedVersion, SystemLog } from "../types";

const getApiKey = () => {
  try {
    const key = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
    return key || '';
  } catch (e) {
    return '';
  }
};

export const processImageRequest = async (
  base64Image: string,
  command: string,
  numVersions: number = 3,
  isProMode: boolean = false,
  resolution: "1K" | "2K" | "4K" = "1K",
  useGrounding: boolean = false
): Promise<ProcessingResult> => {
  const modelName = (isProMode || useGrounding) ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  const requestId = `PRJ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("API_KEY não encontrada. Clique em 'Configurar Chave' no menu lateral.");
  }

  const logs: SystemLog[] = [
    { timestamp: new Date().toLocaleTimeString(), message: `Pipeline Master Ativo: ${requestId}`, type: 'info' },
    { timestamp: new Date().toLocaleTimeString(), message: `Modelo: ${modelName}`, type: 'telemetry' }
  ];
  
  const ai = new GoogleGenAI({ apiKey });

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
    console.error("Erro na análise:", e);
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
      
      // Checar se foi bloqueado por segurança
      if (candidate?.finishReason === 'SAFETY') {
        logs.push({ timestamp: new Date().toLocaleTimeString(), message: `Variação ${i+1} bloqueada pelos filtros de segurança.`, type: 'warning' });
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
      const errMsg = err?.message || "";
      if (errMsg.includes("403") || errMsg.includes("API_KEY_INVALID")) {
        throw new Error("Chave de API inválida ou sem permissão para este modelo.");
      }
      console.error(`Erro na variante ${i+1}:`, err);
    }
  }

  if (versions.length === 0) {
    throw new Error("Não foi possível gerar imagens. A cena pode ter violado as diretrizes de segurança ou a API atingiu o limite.");
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
