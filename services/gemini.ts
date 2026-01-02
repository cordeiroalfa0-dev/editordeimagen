
import { GoogleGenAI } from "@google/genai";
import { ProcessingResult, GeneratedVersion, SystemLog } from "../types";

export const processImageRequest = async (
  base64Image: string,
  command: string,
  numVersions: number = 3,
  isProMode: boolean = false,
  resolution: "1K" | "2K" | "4K" = "1K"
): Promise<ProcessingResult> => {
  const modelName = isProMode ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  const requestId = `PRJ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  
  const logs: SystemLog[] = [
    { timestamp: new Date().toLocaleTimeString(), message: `Pipeline Iterativo Ativo: ${requestId}`, type: 'info' },
    { timestamp: new Date().toLocaleTimeString(), message: `Modo: ${modelName.toUpperCase()}`, type: 'telemetry' }
  ];
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Direção de Arte com Memória de Instrução
  logs.push({ timestamp: new Date().toLocaleTimeString(), message: "Sincronizando contexto e novos objetos...", type: 'api' });
  
  let artDirection: any = {};
  try {
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
          { text: `Aja como um Editor Master de Imagem.
                   CONTEXTO ATUAL: A imagem contém uma pessoa de costas na praia, sem camisa, com tatuagem 'Emerson' e um coração vermelho no glúteo, com areia na pele.
                   NOVO COMANDO: "${command}".
                   
                   REGRAS ABSOLUTAS DE PRESERVAÇÃO:
                   1. MANTER a pessoa de costas e SEM CAMISA (bare back).
                   2. MANTER a tatuagem 'Emerson' e o coração vermelho exatamente nos GLÚTEOS.
                   3. MANTER a areia realista aderida à pele.
                   4. INTEGRAR o novo elemento ("${command}") de forma cinematográfica.
                   
                   Tradução técnica para o renderizador:
                   - Se for "bola de boliche": "A heavy, polished black bowling ball sitting in the sand next to the person".
                   
                   Retorne JSON:
                   {
                     "analise": "Briefing de integração",
                     "promptsFisicos": ["Prompt Master 1", "Prompt 2", ...],
                     "descricoes": ["V1: Adicionada bola de boliche mantendo tatuagem e topless", "v2", ...]
                   }
                   Gere ${numVersions} variantes.` }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    artDirection = JSON.parse(analysisResponse.text || "{}");
  } catch (e: any) {
    if (e?.message?.includes('429')) throw new Error("QUOTA_EXCEEDED");
    artDirection = { 
      analise: "Fallback de segurança.",
      promptsFisicos: Array(numVersions).fill(`Incremental edit: ${command}. Bare back, tattoo 'Emerson' and heart on buttocks, sand on skin, high-end photography.`),
      descricoes: Array(numVersions).fill("Ajuste cumulativo aplicado.")
    };
  }

  const versions: GeneratedVersion[] = [];

  for (let i = 0; i < numVersions; i++) {
    const vId = `${requestId}-V${i+1}`;
    logs.push({ timestamp: new Date().toLocaleTimeString(), message: `Renderizando Camadas V${i+1}...`, type: 'telemetry' });
    
    const tryRender = async (prompt: string): Promise<string | null> => {
      const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
      try {
        const response = await currentAi.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
              { text: `8K RESOLUTION. EDITORIAL PHOTOGRAPHY. ${prompt}. STICK TO THESE: Bare back (no top), visible 'Emerson' text tattoo on glutes with red heart, realistic sand grains on skin, ultra-sharp focus.` }
            ]
          },
          config: { 
            imageConfig: { 
              aspectRatio: "1:1", 
              ...(isProMode && { imageSize: resolution })
            } 
          }
        });

        const candidate = response.candidates?.[0];
        if (!candidate || candidate.finishReason === 'SAFETY') return null;

        for (const part of candidate.content.parts) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
      } catch (err: any) {
        if (err?.message?.includes('429')) throw new Error("QUOTA_EXCEEDED");
        if (err?.message?.includes('403')) throw new Error("PERMISSION_DENIED");
        return null;
      }
    };

    let imageUrl = await tryRender(artDirection.promptsFisicos[i]);

    if (imageUrl) {
      versions.push({
        id: vId,
        imageUrl,
        description: artDirection.descricoes[i] || "Edição concluída com preservação de detalhes.",
        style: "Couture Precision",
        lighting: "Natural Beach",
        scenery: "Praia",
        resolution: isProMode ? resolution : "1K"
      });
      logs.push({ timestamp: new Date().toLocaleTimeString(), message: `V${i+1}: Sincronizada.`, type: 'success' });
    }
  }

  if (versions.length === 0) throw new Error("Falha no renderizador. Tente novamente.");

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
