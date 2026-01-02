
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
  // Upgrade to gemini-3-pro-image-preview if grounding (googleSearch) is requested
  const modelName = (isProMode || useGrounding) ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  const requestId = `PRJ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  
  const logs: SystemLog[] = [
    { timestamp: new Date().toLocaleTimeString(), message: `Pipeline Master Ativo: ${requestId}`, type: 'info' },
    { timestamp: new Date().toLocaleTimeString(), message: `Grounding: ${useGrounding ? 'ATIVADO' : 'DESATIVADO'}`, type: 'telemetry' }
  ];
  
  // Re-instantiate ai client right before usage to ensure current API key from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. ANÁLISE E ENHANCEMENT (Transforma comando simples em briefing técnico)
  logs.push({ timestamp: new Date().toLocaleTimeString(), message: "Aprimorando briefing visual...", type: 'api' });
  
  let artDirection: any = {};
  try {
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
          { text: `Aja como um Diretor de Fotografia de Moda. 
                   O usuário enviou uma imagem e o comando: "${command}".
                   
                   OBJETIVO: Criar 3 variações técnicas de prompt para um modelo de imagem.
                   REGRAS: 
                   1. Mantenha a identidade facial e proporções do corpo.
                   2. Se houver tatuagens ou marcas, preserve-as.
                   3. Descreva a iluminação em termos técnicos (Softbox, Rembrandt, Rim Light).
                   
                   Retorne JSON:
                   {
                     "analise": "O que a IA entendeu da cena",
                     "promptsFisicos": ["Prompt técnico 1", "Prompt técnico 2", "Prompt técnico 3"],
                     "descricoes": ["Texto descritivo 1", "Texto descritivo 2", "Texto descritivo 3"]
                   }
                   Gere EXATAMENTE ${numVersions} prompts.` }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    // response.text directly returns the extracted string
    artDirection = JSON.parse(analysisResponse.text || "{}");
  } catch (e: any) {
    artDirection = { 
      analise: "Fallback mode ativo.",
      promptsFisicos: Array(numVersions).fill(command),
      descricoes: Array(numVersions).fill("Edição padrão aplicada.")
    };
  }

  // 2. BUSCA DE GROUNDING (Se ativado, busca referências reais no Google)
  let groundingUrls: string[] = [];
  if (useGrounding) {
    logs.push({ timestamp: new Date().toLocaleTimeString(), message: "Consultando referências reais via Google Search...", type: 'api' });
    try {
      const searchResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Encontre referências visuais reais e detalhes técnicos para: ${command}. Foque em cenários, arquitetura ou vestuário real.`,
        config: { tools: [{ googleSearch: {} }] }
      });
      // Extract website URLs from groundingChunks
      const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        groundingUrls = chunks.map((c: any) => c.web?.uri).filter(Boolean);
      }
    } catch (e) {}
  }

  const versions: GeneratedVersion[] = [];

  // 3. RENDERIZAÇÃO DAS VERSÕES
  for (let i = 0; i < numVersions; i++) {
    const vId = `${requestId}-V${i+1}`;
    logs.push({ timestamp: new Date().toLocaleTimeString(), message: `Gerando Variante ${i+1}...`, type: 'telemetry' });
    
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
            { text: `PROFESSIONAL EDITORIAL PHOTO. 8K. ${artDirection.promptsFisicos[i]}. PRESERVE PERSON IDENTITY AND BODY MARKS. HIGH-END TEXTURES.` }
          ]
        },
        config: { 
          imageConfig: { 
            aspectRatio: "1:1", 
            // imageSize is only supported for gemini-3-pro-image-preview
            ...((modelName === 'gemini-3-pro-image-preview') && { imageSize: resolution })
          },
          // googleSearch tool is only available for gemini-3-pro-image-preview
          ...(modelName === 'gemini-3-pro-image-preview' && useGrounding && { tools: [{ googleSearch: {} }] })
        }
      });

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          // Iterate through parts to find the image part (inlineData)
          if (part.inlineData) {
            versions.push({
              id: vId,
              imageUrl: `data:image/png;base64,${part.inlineData.data}`,
              description: artDirection.descricoes[i] || "Variação profissional gerada.",
              style: "Editorial Premium",
              lighting: "Studio Master",
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

  if (versions.length === 0) throw new Error("A IA de segurança bloqueou a geração ou ocorreu um erro técnico.");

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
