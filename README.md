# StreamSaver - Universal Video Downloader 🚀

![Version](https://img.shields.io/badge/version-7.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Platform](https://img.shields.io/badge/platform-Chrome_Extension-red)

A powerful, modern Chrome Extension to download videos from **YouTube (Shorts/4K)**, **Instagram**, **Facebook**, **Twitter**, and **1000+ other websites**.

Unlike other downloaders, StreamSaver uses a **background system service** to handle downloads, ensuring high speed, no browser crashes, and support for huge files.

---

## 🔥 New in v7.0: Playlist & Speed Update!
*   **One-Click Playlist Download:** Detects playlists automatically and downloads all videos as a single **ZIP file**.
*   **Hyper-Fast Downloading:** Now uses **Parallel Fragment Downloading** (splits files into 8 parts) to maximize your internet speed.
*   **Smart Background Process:** Downloads continue reliably even if you close the extension popup.

---

## ✨ Features
*   **Universal Support:** Works on YouTube, Insta, TikTok, Vimeo, Twitch, and more.
*   **High Quality:** Supports **4K, 8K**, and High-Fidelity **MP3** extraction.
*   **Audio Mode:** Smartly extracts audio directly without downloading video streams.
*   **Auto-Zipping:** Automatically bundles multi-file downloads into a clean ZIP archive.
*   **One-Click Install:** No command line or coding knowledge required.
*   **Smart Detect:** Automatically finds `yt-dlp` or downloads it if missing.

---

## 📥 How to Install (For Users)

You do **not** need to be a tech expert. Just follow these 3 steps:

### 1. Run the Setup
1.  Download and extract the `StreamSaver-Release` folder.
2.  Open the `Server` folder.
3.  Double-click **`setup.bat`**.
    *   This will automatically install the necessary background service.
    *   It will verify that the downloader engine is ready.
    *   It will start the service for you.

### 2. Install the Extension
1.  Open Google Chrome.
2.  Go to `chrome://extensions` (type this in the address bar).
3.  Turn on **Developer Mode** (switch in the top-right corner).
4.  Click **Load Unpacked**.
5.  Select the `Extension` folder from the download.

### 3. Done!
Go to any YouTube video (or Playlist), click the red **StreamSaver Icon** in your toolbar, and hit Download!

---

## 👨‍💻 For Developers

If you want to modify the source code or build it yourself:

### Prerequisites
*   Node.js (v16+)
*   NPM

### Building from Source
1.  Clone this repository.
2.  Install dependencies:
    ```bash
    cd server
    npm install
    ```
3.  **Build the Release:**
    Run the build script in the root directory:
    ```cmd
    build_release.bat
    ```
    This will compile the Node.js server into a standalone `.exe`, copy the extension files, and create the `StreamSaver-Release` folder ready for distribution.

---

## 🛠️ Troubleshooting

**Q: I clicked Download but nothing happened?**
A: Make sure the background service is running. You can verify this by checking if "StreamSaver-Server.exe" is in your Task Manager, or just run `setup.bat` again to restart it.

**Q: The download says "Completed" but I can't find the file.**
A: Check your browser's default download folder. For playlists, it will be a ZIP file named with the Job ID.

**Q: Windows Defender blocked the file.**
A: Since this is a custom-made tool and not signed by Microsoft, Windows might warn you. Click "More Info" -> "Run Anyway". It is safe and open source.

---

**License:** MIT
**Disclaimer:** This tool is for educational purposes. Please respect copyright laws.