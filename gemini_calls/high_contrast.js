import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai@latest/+esm';

console.log('[high_contrast.js] Module initialized');

const ai = new GoogleGenAI({ apiKey: "AIzaSyCxBemsoT7w_2ANAO0FYVMrZaccR9nlRxo" });
console.log('[high_contrast.js] GoogleGenAI initialized');

export default async function high_contrast_access(renderedHTML) {
  console.log('[high_contrast.js] high_contrast_access function called');
  console.log('[high_contrast.js] HTML input length:', renderedHTML.length);
  
  try {
    const prompt = `Change the colors of this HTML page to be high contrast:

    ${renderedHTML}
    `;
    
    console.log('[high_contrast.js] Calling GoogleGenAI model');
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction: "Output only html. Do not change anything with the <eclec-tech/> tag.",
      }
    });
    
    console.log('[high_contrast.js] Response received from GoogleGenAI');
    console.log('[high_contrast.js] Response text length:', response.text.length);
    
    return response.text;
  } catch (error) {
    console.error('[high_contrast.js] Error calling GoogleGenAI:', error);
    throw error;
  }
}