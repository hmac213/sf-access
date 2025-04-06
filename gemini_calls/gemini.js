import { GoogleGenAI } from '@google/genai';

console.log('[Eclectech/gemini.js] Module loaded');

let ai; // Stores the initialized GoogleGenAI instance

// Function to initialize the Gemini client
function initializeGemini(apiKey) {
  if (!apiKey) {
    throw new Error("[Eclectech] Gemini API Key is required for initialization.");
  }
  if (ai) {
    console.warn('[Eclectech] Gemini already initialized.');
    return;
  }
  console.log('[Eclectech] Initializing Gemini client');
  ai = new GoogleGenAI({ apiKey });
}

// Refined prompts for better adherence
const attribute_instructions = {
  'enable-large-font': 'Increase the base font size of ALL text elements for better readability. Apply this change minimally, affecting only font-size properties or related styles. The change should be noticeable. Preserve all other styles, attributes, and HTML structure.',
  'enable-sparse-text': 'Increase spacing between text elements (like lines, paragraphs, list items, headings) and container elements (like divs) to reduce content density. Adjust margins or padding where appropriate. Preserve all original content, font styles, colors, and overall HTML structure.',
  'enable-high-contrast': 'Modify color and background-color properties to meet high contrast requirements (e.g., WCAG AA or AAA level, typically black/white with other high contrast neon colors). Apply changes *only* to color-related CSS properties. Make sure all text contrasts with its background. Preserve all layout, fonts, and HTML structure.',
  'enable-screen-reader': 'Enhance the HTML for screen reader accessibility. Add `aria-label`, `aria-describedby`, `role` attributes, and semantic HTML elements where appropriate. Ensure images have descriptive `alt` text. Make *no visual changes* to the page layout, styling, or content.',
  'enable-live-subtitles': 'This attribute does not require HTML modification via Gemini. It is handled client-side.' // No Gemini prompt needed
};

async function apply_changes(renderedHTML, attributes) {
  if (!ai) {
    throw new Error("Gemini not initialized. Call initializeGemini(apiKey) first.");
  }

  // Filter out attributes that don't need Gemini processing (like live-subtitles)
  const geminiAttributes = attributes.filter(key => attribute_instructions.hasOwnProperty(key) && key !== 'enable-live-subtitles');

  // If no attributes require Gemini processing, return the original HTML
  if (geminiAttributes.length === 0) {
    console.log("[Eclectech] No attributes require Gemini processing.");
    return renderedHTML;
  }

  // Construct a single, combined prompt focusing only on *what* changes to make
  let combinedInstructions = "Apply the following accessibility modifications based ONLY on the instructions provided:\\n\\n";
  geminiAttributes.forEach((key, index) => {
    combinedInstructions += `${index + 1}. ${attribute_instructions[key]}\\n`;
  });

  const prompt = `${combinedInstructions}\\nHTML Document:\\n\`\`\`html\n${renderedHTML}\n\`\`\``;

  // Define the meta-instructions for the model
  const systemInstruction = "You are an AI assistant that modifies HTML code for accessibility. Respond ONLY with the complete, modified HTML source code. \\nIMPORTANT RULES:\\n1. Make ONLY the changes explicitly requested in the prompt.\\n2. Preserve the original HTML structure, non-targeted attributes, content, comments, and all other styles EXACTLY unless modification is required by an instruction.\\n3. Do NOT truncate the output under any circumstances. Return the FULL, complete HTML document.\\n4. Do NOT include explanations, apologies, or any text other than the HTML code.\\n5. Do not change anything about the <eqlec-tech> tag or its contents.";

  console.log(`[Eclectech] Starting combined Gemini run for: ${geminiAttributes.join(', ')}`);
  // console.log("Prompt:", prompt); // Optional: Log the full prompt for debugging
  // console.log("System Instruction:", systemInstruction); // Optional: Log system instruction

  try {
    console.time('[Eclectech] Gemini API Call'); // Start timer
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro-preview-03-25",
      contents: [{ role: "user", parts: [{ text: prompt }] }], // Use structured content format
      systemInstruction: { role: "system", parts: [{ text: systemInstruction }] }, // Pass system instruction separately
      generationConfig: {
        temperature: 0.3, // Lower temperature for more deterministic output
        // maxOutputTokens: ..., // Avoid unless truncation persists
        stopSequences: [] // Explicitly clear stop sequences
      }
    });
    console.timeEnd('[Eclectech] Gemini API Call'); // End timer normally

    // More robust response handling
    let modifiedHtml = "";
    // Accessing response correctly based on potential structure changes
    if (response && response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts[0]) {
      modifiedHtml = response.candidates[0].content.parts[0].text;
      // Refined cleanup for markdown code fences (handles optional leading whitespace)
      modifiedHtml = modifiedHtml.replace(/^\s*```html\s*/im, '').replace(/```\s*$/im, '').trim();
    } else {
      console.error("[Eclectech] Invalid response structure received from Gemini API:", response);
      throw new Error("Invalid response structure from Gemini API");
    }

    // Basic validation: Check if the core tag is still present
    if (!modifiedHtml.includes('<eqlec-tech')) {
      console.warn("[Eclectech] Potential issue: <eqlec-tech> tag missing in Gemini response. Returning original HTML.");
      // Optionally throw an error or implement more robust checks
      return renderedHTML; // Fallback to original HTML
    }

    return modifiedHtml;
  } catch (error) {
    console.timeEnd('[Eclectech] Gemini API Call'); // End timer also on error
    console.error(`[Eclectech] Error during combined Gemini API call:`, error);
    // Consider returning original HTML as a fallback on error
    // return renderedHTML;
    throw error; // Re-throwing for now
  }
}

// Export the initialization function and the apply_changes function
export { initializeGemini, apply_changes };