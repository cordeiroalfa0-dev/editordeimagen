
import { GoogleGenAI } from "@google/genai";
import { ProcessingResult, GeneratedVersion, SystemLog } from "../types";

// Helper para acessar o processo de forma segura
const getApiKey = () => {
  try {
    return (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
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

  const logs: SystemLog[] = [
    { timestamp: new Date().toLocaleTimeString(), message: `Pipeline Master Ativo: ${requestId}`, type: 'info' },
    { timestamp: new Date().toLocaleTimeString(), message: `Grounding: ${useGrounding ? 'ATIVADO' : 'DESATIVADO'}`, type: 'telemetry' }
  ];
  
  const ai = new GoogleGenAI({ apiKey });

  // 1. ANÁLISE E ENHANCEMENT
  let artDirection: any = {};
  try {
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
          { text: `Aja como Diretor de Fotografia. Analise o comando: "${command}". 
                   Retorne JSON: { "analise": "string", "promptsFisicos": ["string"], "descricoes": ["string"] } 
                   Gere ${numVersions} variações.` }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    artDirection = JSON.parse(analysisResponse.text || "{}");
  } catch (e: any) {
    artDirection = { 
      analise: "Fallback mode.",
      promptsFisicos: Array(numVersions).fill(command),
      descricoes: Array(numVersions).fill("Edição padrão.")
    };
  }

  // 2. BUSCA DE GROUNDING
  let groundingUrls: string[] = [];
  if (useGrounding) {
    try {
      const searchResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Referências para: ${command}`,
        config: { tools: [{ googleSearch: {} }] }
      });
      const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) groundingUrls = chunks.map((c: any) => c.web?.uri).filter(Boolean);
    } catch (e) {}
  }

  const versions: GeneratedVersion[] = [];

  // 3. RENDERIZAÇÃO
  for (let i = 0; i < numVersions; i++) {
    const vId = `${requestId}-V${i+1}`;
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
            { text: `EDITORIAL PHOTO. 8K. ${artDirection.promptsFisicos[i]}. HIGH-END.` }
          ]
        },
        config: { 
          imageConfig: { 
            aspectRatio: "1:1", 
            ...((modelName === 'gemini-3-pro-image-preview') && { imageSize: resolution })
          },
          ...(modelName === 'gemini-3-pro-image-preview' && useGrounding && { tools: [{ googleSearch: {} }] })
        }
      });

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            versions.push({
              id: vId,
              imageUrl: `data:image/png;base64,${part.inlineData.data}`,
              description: artDirection.descricoes[i] || "Variação profissional.",
              style: "Editorial",
              lighting: "Studio",
              scenery: "Dynamic",
              resolution: (modelName === 'gemini-3-pro-image-preview') ? resolution : "1K",
              groundingUrls: groundingUrls.length > 0 ? groundingUrls : undefined
            });
          }
        }
      }
    } catch (err) {
      console.error("Render error", err);
    }
  }

  if (versions.length === 0) throw new Error("A IA de segurança bloqueou a geração ou a chave de API está incorreta.");

  return {
    id: requestId,
    analysis: artDirection.analise || "Análise concluída",
    confirmation: "Sucesso",
    versions,
    originalAlignedUrl: base64Image,
    logs,
    timestamp: Date.now()
  };
};
