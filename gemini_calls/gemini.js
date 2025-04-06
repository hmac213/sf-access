import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai@latest/+esm';

console.log('[high_contrast.js] Module initialized');

const ai = new GoogleGenAI({ apiKey: `${process.env.GEMINI_API_KEY}` });

const attribute_prompts = {
  'enable-large-font' : 'Increase the font size of all text in this html to be more accessible for readers who require larger fonts:',
  'enable-sparse-text' : 'Decrease the text density of the website to optimize for accessibility. Please try and preserve as much formatting as you can:',
  'enable-high-contrast' : 'Change the colors of this HTML page to be high contrast:',
  'enable-screen-reader' : 'Optimize all html for screen readers, using aria-labels and similar tools when necessary. do not make any visual changes:'
}

export default async function apply_changes(renderedHTML, attributes) {
  const keys = attributes.filter(key => attribute_prompts.hasOwnProperty(key));
  for (const key of keys) {
    console.log(`Starting gemini run for ${key}`);
    const prompt = `${attribute_prompts[key]}
      ${renderedHTML}`
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          systemInstruction: "Output only html. Do not change anything about the <eclec-tech /> tag.",
        }
      });

      renderedHTML = response.text.replace(/^```html\s*/, '').replace(/```\s*$/, '');
    } catch(error) {
      throw error;
    }
  }
  return renderedHTML;
}