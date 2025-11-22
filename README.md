# Flow - Content Pipeline

**Flow** is a keyboard-first, high-performance content strategy dashboard inspired by the speed and density of Superhuman. It unifies strategy (Pillars), tactics (Executions), and creation (Editor) into a single, fluid 3-pane interface powered by Google's Gemini API.

Designed for content creators who value speed, structure, and AI-augmented workflows over simple chatbots.

## 🚀 Core Philosophy

Most AI writing tools are chat-bots. Flow is a **Command Center**. 

It treats content as structured data that flows from high-level strategic themes down to platform-specific executions. It is designed for speed, mutability, and deep customization of the AI's voice via "Few-Shot" learning and global voice settings.

## ⚡ Features

### 1. Strategic Intelligence (Column 1)
*   **Pillar Management**: Organize content around core beliefs and topics rather than just calendar dates.
*   **AI Ideation**: Instantly generate contrarian or insightful pillar ideas for specific topics.
*   **Theme Analysis ("Red Threads")**: The AI analyzes your entire library to identify cross-cutting themes (e.g., "Deep Work", "Systems Thinking", "Human vs Machine") that connect seemingly unrelated pillars.

### 2. Tactical Execution (Column 2)
*   **Multi-Platform Drafting**: Select a strategic pillar and generate tailored drafts for **LinkedIn**, **X (Twitter)**, **Newsletters**, **Instagram**, and **YouTube** simultaneously.
*   **Platform Constraints**: The AI respects character limits and formatting styles specific to each platform (e.g., threads for X, visual hooks for Instagram).
*   **Draft State**: Manage status from `Draft` to `Scheduled` to `Published`.

### 3. AI-Native Editor (Column 3)
*   **Command Deck**: A persistent input field for conversational editing directly below the canvas.
*   **Magic Actions**: One-click refinements like "Shorten", "Punch Up", "Fix Grammar", "Professional", or "Casual".
*   **Live Context**: The AI is aware of the specific platform constraints while editing.

### 4. Deep Customization (Settings)
*   **Global Voice**: Define a master personality (e.g., "Professional but contrarian", "Witty and concise") that applies to all generations.
*   **Platform Tuning**: Set specific formatting rules for each channel.
*   **Few-Shot Learning**: Paste your own writing samples in the Settings. The AI analyzes these to mimic your specific sentence structure and tone.
*   **Model Selection**: Switch between `Gemini 2.5 Flash` (Speed) and `Gemini 3.0 Pro` (Reasoning).

## ⌨️ Keyboard Shortcuts

Flow is designed to be navigated almost entirely without a mouse.

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate items in lists |
| `←` / `→` | Switch between Columns (Strategy -> Tactics -> Editor) |
| `Enter` | Enter "Edit Mode" for the selected draft |
| `Esc` | Exit "Edit Mode" or close modals |
| `Cmd+J` | Focus AI Command Input (in Editor) |
| `Cmd+K` | Focus Search |
| `Cmd+Enter` | Confirm / Run Generator (in Modal) |

## 🛠️ Technical Stack

*   **Frontend**: React 19 (via ESM Import Maps, no bundler required for dev)
*   **Styling**: Tailwind CSS (Dark Mode optimized)
*   **AI Model**: Google Gemini API (`@google/genai`)
*   **Persistence**: LocalStorage for user settings and content.

## 📦 Getting Started

1.  **Clone the repository**.
2.  **Set up API Key**:
    *   Get a Gemini API Key from [Google AI Studio](https://aistudio.google.com/).
    *   The app expects `process.env.API_KEY`. Since this is a frontend-only build using Import Maps, you might need to configure your serving environment or replace `process.env.API_KEY` in `services/geminiService.ts` with your key for local testing (DO NOT COMMIT KEYS).
3.  **Run**:
    *   Serve the root directory with any static server (e.g., `npx serve` or `python3 -m http.server`).
    *   Open `index.html` in your browser.

---

*Built with React, Tailwind, and Gemini.*