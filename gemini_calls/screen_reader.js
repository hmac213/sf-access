import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai@latest/+esm';

console.log('[screen_reader.js] Module initialized');

const ai = new GoogleGenAI({ apiKey: "AIzaSyCxBemsoT7w_2ANAO0FYVMrZaccR9nlRxo" });
console.log('[screen_reader.js] GoogleGenAI initialized');

export default async function screen_reader_access(renderedHTML) {
  console.log('[screen_reader.js] screen_reader_access function called');
  console.log('[screen_reader.js] HTML input length:', renderedHTML.length);
  
  try {
    const prompt = `Update the attributes of this HTML to optimize for screen reader support. Do not change any visual content:

    ${renderedHTML}
    `;
    
    console.log('[screen_reader.js] Calling GoogleGenAI model');
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction: "Output only html. Do not change anything with the <eclec-tech/> tag.",
      }
    });
    
    console.log('[screen_reader.js] Response received from GoogleGenAI');
    console.log('[screen_reader.js] Response text length:', response.text.length);
    
    return response.text;
  } catch (error) {
    console.error('[screen_reader.js] Error calling GoogleGenAI:', error);
    throw error;
  }
}