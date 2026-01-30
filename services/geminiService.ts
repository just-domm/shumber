
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "@/types";

export const analyzeProduceQuality = async (base64Image: string): Promise<AnalysisResult> => {
  // Initialize inside the function to ensure process.env.API_KEY is available at call-time
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  const prompt = `Analyze this image of agricultural produce. 
  1. Identify the crop name.
  2. Provide a freshness/quality score (0-100).
  3. Estimate remaining shelf life (days).
  4. Provide a brief market insight.
  Return JSON only.`;

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cropName: { type: Type.STRING },
          freshnessScore: { type: Type.NUMBER },
          estimatedShelfLife: { type: Type.STRING },
          marketInsight: { type: Type.STRING }
        },
        required: ["cropName", "freshnessScore", "estimatedShelfLife", "marketInsight"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as AnalysisResult;
};