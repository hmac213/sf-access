import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai@latest/+esm';

const ai = new GoogleGenAI({ apiKey: "AIzaSyCxBemsoT7w_2ANAO0FYVMrZaccR9nlRxo" });

export default async function large_font_access(renderedHTML) {
  const prompt = `Increase the font size of all text in this html to be more accessible for readers who require larger fonts:

  ${renderedHTML}
  `

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      systemInstruction: "Output only html. Do not change anything with the <eclec-tech/> tag.",
    }
  });
  console.log(response.text);

  return response.text;
}