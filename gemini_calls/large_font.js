import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai@latest/+esm';

console.log('[large_font.js] Module initialized');

const ai = new GoogleGenAI({ apiKey: "AIzaSyCxBemsoT7w_2ANAO0FYVMrZaccR9nlRxo" });
console.log('[large_font.js] GoogleGenAI initialized');

export default async function large_font_access(renderedHTML) {
  console.log('[large_font.js] large_font_access function called');
  console.log('[large_font.js] HTML input length:', renderedHTML.length);
  
  try {
    const prompt = `Increase the font size of all text in this html to be more accessible for readers who require larger fonts, also make the text blue:

    ${renderedHTML}
    `;
    
    console.log('[large_font.js] Calling GoogleGenAI model');
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction: "Output only html. Do not change anything with the <eclec-tech/> tag.",
      }
    });
    
    console.log('[large_font.js] Response received from GoogleGenAI');
    console.log('[large_font.js] Response text length:', response.text.length);
    
    return response.text;
  } catch (error) {
    console.error('[large_font.js] Error calling GoogleGenAI:', error);
    throw error;
  }
}