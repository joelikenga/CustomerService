# Customer Service AI Widget

A beautiful, customizable, and voice-enabled React chat widget for generic AI customer support. Built with modern web technologies including React, Framer Motion, and Tailwind CSS styles.

## Features

- 🎙️ **Voice Mode**: Full speech-to-text and text-to-speech support for hands-free interaction.
- 🎨 **Visual Customization**: Fully customizable colors, positions, styles, and themes.
- 📱 **Responsive Design**: optimized for both desktop and mobile devices.
- 🔗 **Social Media Integration**: Display links to your social platforms (Instagram, WhatsApp, LinkedIn, etc.).
- 🛠️ **Easy Integration**: Simple drop-in component for any React application.
- 🔒 **Secure**: Configurable API endpoints and optional API key support.

## Installation

Install the package using npm, yarn, or pnpm from the registry.

```bash
npm install customer-service-ai
# or
yarn add customer-service-ai
# or
pnpm add customer-service-ai
```

You also need to ensure you have the peer dependencies installed:

```bash
npm install react react-dom framer-motion lucide-react
```

## Basic Usage

Import the `ChatWidget` component and place it at the root of your application (or anywhere you want it to render).

```tsx
// Basic Usage
import { ChatWidget } from 'customer-service-ai';

function App() {
  return (
    <div>
      <h1>My Awesome App</h1>
      <ChatWidget 
        opts={{
          aiName: "Support Bot",
          primaryColor: "#007BFF"
        }} 
      />
    </div>
  );
}

export default App;
```

## Props & Configuration

The `ChatWidget` component accepts a single prop `opts` of type `ChatOptions`. Below is the complete list of available options:

### `ChatOptions`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aiName` | `string` | `"Jay - AI"` | Name of the AI assistant displayed in the header. |
| `subtitle` | `string` | `"Ask anything..."` | Subtitle text under the AI name. |
| `firstMessage` | `string` | `"Hello! ..."` | The initial welcome message sent by the AI. |
| `position` | `"left" \| "center" \| "right"` | `"center"` | Horizontal position of the open chat window. |
| `iconPosition` | `"left" \| "right"` | `"right"` | Position of the floating trigger button. |
| `primaryColor` | `string` | `"#7C3AED"` | Primary accent color for buttons and user messages. |
| `textColor` | `string` | `"#ffffff"` | Text color for the widget. |
| `bgStyle` | `string` | `linear-gradient(...)` | CSS background property for the chat window. |
| `fontFamily` | `string` | `"Inter, ..."` | Font family for the widget text. |
| `businessContext` | `string` | `(Default context)` | System instruction appended to the prompt for context. |
| `apiKey` | `string` | `""` | Optional API key sent in the `Authorization` header. |
| `developerEmail` | `string` | `""` | Optional developer email sent in the request body. |
| `socialLinks` | `SocialLink[]` | `[]` | Array of social media links to display (see below). |
| `overlay` | `boolean` | `true` | Whether to show a backdrop overlay when the chat is open. |
| `voiceRate` | `number` | `0.9` | Speed of the voice speech (0.1 to 10). Lower is slower. |
| `className` | `string` | `""` | Additional CSS class names for the widget container. |

### Social Links Configuration

You can add social media links to the bottom of the chat interface.

```tsx
const socialLinks = [
  { platform: "whatsapp", url: "https://wa.me/1234567890" },
  { platform: "instagram", url: "https://instagram.com/yourbusiness" },
  { platform: "email", url: "mailto:support@example.com" }
];

// ... inside ChatWidget opts
socialLinks: socialLinks
```

Supported platforms: `"instagram"`, `"facebook"`, `"twitter"`, `"linkedin"`, `"whatsapp"`, `"email"`, `"phone"`.

## API Integration

The widget sends a POST request to your `apiEndpoint` with the following JSON body:

```json
{
  "prompt": "System Context...\nConversation History...\nUSER: [Input]\nASSISTANT:",
  "developer_email": "optional-email@example.com"
}
```

### Expected Response

Your backend should respond with:

```json
{
  "answer": "The AI's response text here.",
  "show_socials": false // optional boolean to trigger social links display
}
```

If an error occurs, the widget expects:

```json
{
  "error": "Error message description",
  "show_socials": true // optionally show socials on error
}
```

## Voice Mode 🎙️

The widget automatically handles voice interactions using the browser's `SpeechRecognition` and `SpeechSynthesis` APIs.
- Users can click the microphone icon to toggle voice mode.
- In voice mode, the AI reads responses aloud.
- The interface changes to a voice-visualizer view.

## License

ISC © 2024
