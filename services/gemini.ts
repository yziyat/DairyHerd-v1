import { GoogleGenAI } from "@google/genai";
import { Cow, CowEvent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function askHerdConsultant(
  question: string, 
  contextData: { cows: Cow[], events: CowEvent[], currentCowId?: string }
) {
  try {
    // We limit the context size to avoid token limits, prioritizing the current cow if selected, 
    // or a summary of the herd if not.
    let systemContext = "";
    
    if (contextData.currentCowId) {
      const cow = contextData.cows.find(c => c.id === contextData.currentCowId);
      const cowEvents = contextData.events.filter(e => e.cowId === contextData.currentCowId);
      systemContext = `
        You are an expert Dairy Herd Management Consultant assisting a farmer.
        The user is currently looking at Cow ID: ${cow?.id}.
        
        Cow Details:
        ${JSON.stringify(cow, null, 2)}
        
        Recent Events:
        ${JSON.stringify(cowEvents, null, 2)}
        
        Answer the question specifically about this cow or general dairy protocols.
      `;
    } else {
      // Herd wide summary
      const pregCount = contextData.cows.filter(c => c.reproStatus === 'PREG').length;
      const openCount = contextData.cows.filter(c => c.reproStatus === 'OPEN').length;
      const freshCount = contextData.cows.filter(c => c.reproStatus === 'FRESH').length;
      
      systemContext = `
        You are an expert Dairy Herd Management Consultant.
        Current Herd Summary:
        - Total Cows: ${contextData.cows.length}
        - Pregnant: ${pregCount}
        - Open: ${openCount}
        - Fresh: ${freshCount}
        
        The user asks a question about the herd. Provide professional, concise advice similar to a vet or herd manager.
      `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question,
      config: {
        systemInstruction: systemContext,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to the consultant service right now. Please check your connection.";
  }
}
