# desktop-utils

A desktop utility application built with React and Vite.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- Google Gemini API Key (for AI features)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up Gemini API Key:
- Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- We use gemini-2.5-flash
- There are 2 methods to use api key:
- method 1: Set API key in enviroment
   - Create a `.env` file in the root directory
   - Add the following line:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
- method 2: Set API key through entering in App
   - Open tag page
   - click any AI button
   - if there is no known API key, a window will appear and you can enter your api key
   - API key will only store in session. If click F5, the key will be deleted

### Development

To run the application in development mode:

```bash
npm run dev
```

This will start the development server at `http://localhost:5173/`

The page will automatically reload when you make changes to the code.

## Features

### AI-Powered Tag Management

The application includes two AI features powered by Google Gemini:

1. **AI Generate Tag**: Analyzes desktop files and automatically suggests appropriate tags for categorization
2. **AI Assign Tag**: Automatically assigns desktop files to existing tags based on their characteristics

Both features require a valid Gemini API key to function.

<!--

### Build

To create a production build:

```bash
npm run build
```

The optimized files will be generated in the `dist` folder.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

-->
