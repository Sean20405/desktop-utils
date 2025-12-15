<h1 align="center">Desktop Organizer</h1>
<h4 align="center">An application (web demo, React-based) designed to help organize desktop with AI-powered features</h4>
<p align="center">
  <a href="#authors">Authors</a>&nbsp;&nbsp;•&nbsp;
  <a href="#features">Features</a>&nbsp;&nbsp;•&nbsp;
  <a href="#getting-started">Getting Started</a>&nbsp;&nbsp;•&nbsp;
  <a href="#project-structure">Project Structure</a>&nbsp;&nbsp;•&nbsp;
  <a href="#license">License</a>
</p>

## Authors
<a href="https://github.com/Sean20405/desktop-utils/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Sean20405/desktop-utils" />
</a>

## Features

- **Desktop Visualization**: View your current desktop layout in a web interface.
- **AI-Powered Organization**:
  - **Generate Tags**: Analyzes your desktop files and automatically suggests appropriate categories/tags using Google Gemini AI.
  - **Assign Tags**: Automatically assigns files to existing tags based on their names and characteristics.
- **Customizable Layout**: Organize your desktop icons efficiently.
- **Desktop Info Extractor**: A C# utility to extract icon positions and images from your actual Windows desktop.

## Getting Started

### 0. Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- Google Gemini API Key (for AI features)
- Windows OS (required for the `GetDesktopInfo` extraction tool. Optional, if you want to use your own desktop content)

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Sean20405/desktop-utils
cd desktop-utils
npm install
```

### 2. Setup Gemini API Key

To use the AI features, you need a Google Gemini API key. You can obtain one from [Google AI Studio](https://makersuite.google.com/app/apikey).

There are two ways to configure the API key:

- **Method 1: Environment Variable (Recommended for Dev)**
   - Create a `.env` file in the root directory and add:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
- **Method 2: In-App Entry**
   1. Open the application and navigate to the Tag page.
   2. If there is no known API key, a window will appear and you can enter your api key

>[!Note]
> API key will only store in session. If click F5, the key will be deleted.

### 3. Extract Desktop Information (Optional)

To visualize your own desktop, you need to extract the layout data using our executable file

1. Navigate to [Latest Release](releases/latest) to download the zip file. Or click here: [DesktopInfo (.zip)](https://github.com/Sean20405/desktop-utils/releases/download/v1.0.0/DesktopInfo.zip)
2. Unzip the file and run the executable file (GetDesktopInfo.exe). You may need to disable your antivirus software.
   * Running the tool will generate:
      * `Desktop_Icons_Info.txt`: Contains coordinates and metadata.
      * Icon images extracted from your desktop.
4. Organize these files into a folder.

### 4. Running the Application

Start the development server:

```bash
npm run dev
```

### 5. Using Your Data

1. When the app loads, you will see an upload screen (unless `SKIP_UPLOAD` is set to `true` in `src/App.tsx`).
2. Upload the folder containing your `Desktop_Icons_Info.txt` and icon images.
3. The application will render your desktop layout.

>[!Note]
> To skip the upload screen and use default test data for development, set `const SKIP_UPLOAD = true;` in `src/App.tsx`.*

## Project Structure

```
.
├── src/
│   ├── components/        # UI components
│   ├── context/           # React Context for state management
│   ├── data/              # Default data for testing and demos
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Main application entry point
│   └── main.tsx           # React DOM rendering
├── DesktopInfo/           # C# project for extracting Windows desktop icon information
│   ├── GetDesktopInfo/    # Source code for the extractor tool
│   └── GetDesktopInfo.exe # Executable tool
└── README.md
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
