# StreamSaver - YouTube Downloader Extension

**StreamSaver** is a powerful Chrome extension that allows you to download YouTube videos in high quality (up to 1080p+ with audio) directly to your computer.

Unlike standard browser extensions that are limited by YouTube's streaming protocols, StreamSaver uses a **Local Core Server** powered by `yt-dlp` to handle the heavy lifting. This ensures you get the **best possible quality** (video + audio merged) without the limitations of direct browser stream capture.

## 🚀 Features

*   **High Quality Downloads:** Supports 1080p, 720p, 360p, and "Best Available" resolution.
*   **Smart Merging:** Automatically merges video and audio streams (essential for 1080p+ content).
*   **Audio Extraction:** Convert videos to MP3 audio.
*   **Clean UI:** Simple, dark-themed popup interface.
*   **No Third-Party Servers:** Everything runs locally on your machine for privacy and speed.

## 🛠 Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js**: [Download here](https://nodejs.org/) (Required to run the local server).
2.  **yt-dlp**: [Download here](https://github.com/yt-dlp/yt-dlp#installation).
    *   **Crucial:** `yt-dlp` must be installed and added to your system's **PATH** so it can be run from a command line.
    *   *Tip:* On Windows, you can download the `.exe` and place it in `C:\Windows\System32` or add its folder to your Environment Variables.
3.  **FFmpeg** (Optional but Recommended): Required for merging 1080p video + audio and for MP3 conversion. [Download here](https://ffmpeg.org/download.html).

## 📥 Installation

### 1. Setup the Local Server
The server handles the actual downloading and processing.

1.  Open your terminal/command prompt.
2.  Navigate to the `server` folder:
    ```bash
    cd server
    ```
3.  Install the required Node.js dependencies:
    ```bash
    npm install
    ```

### 2. Install the Extension
1.  Open Google Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** in the top right corner.
3.  Click **Load unpacked**.
4.  Select the root folder of this project (the folder containing `manifest.json`).

## 🖥 Usage

1.  **Start the Server:**
    Whenever you want to use the downloader, the local server must be running.
    ```bash
    # Inside the 'server' directory
    node server.js
    ```
    You should see: `StreamSaver Local Server running at http://localhost:3000`

2.  **Download a Video:**
    *   Go to any YouTube video.
    *   Click the **StreamSaver icon** in your browser toolbar.
    *   Select your desired **Format** (MP4 or MP3).
    *   If MP4, select your **Quality** (Best, 720p, 360p).
    *   Click **Download Direct**.
    *   *Wait a moment* while the server processes the file. The download will automatically start in your browser once ready.

## 📁 Project Structure

*   `manifest.json` - Chrome Extension configuration.
*   `popup.html / .js / .css` - The extension's user interface.
*   `background.js` - Handles communication between the popup and the local server.
*   `content.js` - Reads video information from the YouTube page.
*   `server/` - The Node.js backend.
    *   `server.js` - API that runs `yt-dlp`.
    *   `downloads/` - Temporary staging area for processed videos (automatically cleaned).

## ⚠️ Troubleshooting

*   **"Server Error" or "Failed to fetch":** Ensure the Node.js server is running (`node server.js`).
*   **"yt-dlp failed":** Make sure `yt-dlp` is installed and reachable from your terminal. Try running `yt-dlp --version` in your command prompt to verify.
*   **Low Quality:** Ensure you have FFmpeg installed if you are trying to download 1080p or higher, as these formats often require merging separate video/audio streams.
