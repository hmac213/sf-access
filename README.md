# Eqlectech Accessibility Element

A Web Component that enhances web pages with accessibility features powered by Google Gemini.

## Installation

```bash
npm install eqlectech-accessibility
# or
yarn add eqlectech-accessibility
```

## Usage

### Plain HTML/JavaScript

1.  Import the script in your HTML:
    ```html
    <script type="module" src="/node_modules/eqlectech-accessibility/index.js"></script>
    ```

2.  Add the custom element to your HTML, providing your Gemini API Key:
    ```html
    <eclec-tech api-key="YOUR_GEMINI_API_KEY"></eclec-tech>
    ```

3.  The accessibility button will appear, and users can configure features.

### React Integration

1.  Import the package in your main application file (e.g., `App.js` or `index.js`):
    ```javascript
    import 'eqlectech-accessibility';
    ```

2.  Use the custom element within your React component, passing the API key:
    ```jsx
    import React, { useEffect } from 'react';
    import 'eqlectech-accessibility';

    function App() {
      const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY; // Example: Load key from env vars

      // Ensure the custom element definition is loaded
      useEffect(() => {
        // Optional: Add any setup logic if needed after component mounts
      }, []);

      if (!geminiApiKey) {
        console.error("Gemini API Key is missing!");
        // Handle missing key appropriately (e.g., render an error message)
        return <div>Error: Missing API Key</div>;
      }

      return (
        <div className="App">
          {/* Render the custom element */}
          <eclec-tech api-key={geminiApiKey}></eclec-tech>

          {/* Your application content */}
          <h1>My React App</h1>
          <p>Welcome to the application.</p>
          {/* ... other components ... */}
        </div>
      );
    }

    export default App;
    ```

**Important:**

*   **API Key:** You **must** provide a valid Google Gemini API key via the `api-key` attribute. Keep your key secure and do not commit it directly into your source code. Consider using environment variables.
*   **Styling:** The component injects its own styles for the button and loading overlay. You might need to adjust CSS if conflicts arise.
*   **Frameworks:** Since this is a standard Web Component, it should work with other frameworks (Vue, Angular, Svelte) similarly to React, though specific integration details might vary slightly.

## Configuration

The component uses attributes to enable features:

*   `enable-large-font`: Increases font size.
*   `enable-high-contrast`: Adjusts colors for high contrast.
*   `enable-screen-reader`: Optimizes HTML for screen readers (ARIA labels, etc.).
*   `enable-live-subtitles`: Adds a live subtitles overlay (requires browser support for SpeechRecognition).

The accessibility button allows users to toggle these features, which dynamically adds/removes these attributes from the `<eclec-tech>` element.

## How it Works

1.  The `<eclec-tech>` element initializes when added to the DOM.
2.  It reads the provided `api-key` attribute.
3.  It initializes the Google Gemini client.
4.  It adds an accessibility button to the page.
5.  When accessibility features are enabled (via the button/config popup or initially set attributes), it:
    *   Stores the original page HTML.
    *   Sends the HTML and the requested modifications (based on active attributes) to the Gemini API.
    *   Receives the modified HTML from Gemini.
    *   Replaces the page content with the modified HTML.
    *   Caches the result in `localStorage` for the specific combination of features.
6.  If features are disabled, it restores the original HTML (if previously modified). 