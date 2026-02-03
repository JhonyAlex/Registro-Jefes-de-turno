import { GoogleGenerativeAI } from "@google/genai";
import { ProductionRecord } from "../types";

// Get the API key from environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

// Initialize Gemini Client only if the API key is available
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;


export const analyzeShiftData = async (records: ProductionRecord[]): Promise<string> => {
  if (!model) {
    return "El servicio de análisis inteligente no está configurado. Para usar esta función, añada una VITE_GEMINI_API_KEY a su archivo .env.local.";
  }
  
  try {
    // Limit to last 20 records to avoid token limits in this demo
    const recentRecords = records.slice(0, 20);
    
    const dataSummary = recentRecords.map(r => 
      `- ${r.date} (${r.shift}): ${r.machine} produjo ${r.meters}m con ${r.changesCount} cambios ("${r.changesComment}")`
    ).join('\n');

    const prompt = `
      Actúa como un analista experto en producción industrial para la empresa "Pigmea".
      Analiza los siguientes registros de producción recientes:
      
      ${dataSummary}
      
      Proporciona un resumen ejecutivo breve (máximo 150 palabras) en español.
      1. Identifica la máquina con mejor rendimiento.
      2. Detecta patrones negativos en los comentarios de cambios (ej. muchas roturas).
      3. Sugiere una acción de mejora rápida.
      Usa un tono profesional y directivo.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    return text || "No se pudo generar el análisis.";

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Provide a more specific error message if an API key issue is detected
    if (error instanceof Error && error.message.includes('API key not valid')) {
        return "Error: La clave de API de Gemini no es válida. Por favor, verifique la clave en su archivo .env.local.";
    }
    return "Error al conectar con el servicio de análisis inteligente. Verifique la consola para más detalles.";
  }
};
