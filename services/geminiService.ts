
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "@/app/types/types";





export const analyzeProduceQuality = async (base64Image: string): Promise<AnalysisResult> => {
  // Always create instance inside the function call to ensure API_KEY is loaded
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

export const parseOfflineMessage = async (input: string | { data: string, mimeType: string }): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  const prompt = `You are the ShambaPulse AI Gateway. Extract harvest details from this farmer's message (Text or Audio).
  The farmer might use English, Swahili, or Sheng (slang). 
  Identify: 
  - cropName (e.g., Maize, Cabbage, Potatoes)
  - quantity (estimate in KG if bags/units mentioned. 1 bag is roughly 90kg unless specified)
  - locationName (Must match one of: Molo, Bahati, Naivasha, Gilgil, Njoro, Rongai, Subukia, Kuresoi, Nakuru CBD)
  - farmerName (if mentioned, else use "Farmer")
  Return JSON only.`;

  const contentParts: any[] = [{ text: prompt }];
  
  if (typeof input === 'string') {
    contentParts.push({ text: `Farmer Message: "${input}"` });
  } else {
    contentParts.push({ inlineData: input });
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts: contentParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cropName: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          locationName: { type: Type.STRING },
          farmerName: { type: Type.STRING }
        },
        required: ["cropName", "quantity", "locationName"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};
