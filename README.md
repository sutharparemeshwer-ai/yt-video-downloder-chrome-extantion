# StreamSaver - Universal Video Downloader 🚀

![Version](https://img.shields.io/badge/version-6.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Platform](https://img.shields.io/badge/platform-Chrome_Extension-red) ![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20yt--dlp-green)

A powerful, modern Chrome Extension to download videos from **YouTube (including Shorts)**, **Instagram**, **Facebook**, **Twitter**, and **1000+ other websites**. It uses a local server powered by `yt-dlp` to ensure the highest quality downloads (up to 4K/8K) and format conversion (MP3).

---

## ✨ Features

*   **🌍 Universal Support:** Works on YouTube, Instagram Reels, Facebook, Vimeo, Twitter, TikTok, and 1000+ more sites.
*   **⚡ YouTube Shorts Optimized:** Automatically detects Shorts and optimizes file size (Max 1080p, <50MB) while keeping normal videos in 4K.
*   **🎨 Modern Dark UI:** Sleek, professional popup design with Red accents and animated custom dropdowns.
*   **🎵 Format Conversion:** Download as **Video (MP4)** or extract **Audio (MP3)** instantly.
*   **🔓 Cookie Bypass:** Uses your browser cookies to download age-restricted or premium videos you have access to.
*   **🚀 High Performance:** No browser throttling. Downloads happen outside the browser via the local server.

---

## 🛠️ Architecture

This project uses a **Hybrid Architecture** to bypass browser limitations:

1.  **Frontend (Extension):** Detects the URL and sends it to the local server.
2.  **Backend (Local Server):** Receives the request, spawns a `yt-dlp` process, and handles the heavy lifting.
3.  **Core Engine (yt-dlp):** The industry-standard command-line tool that fetches the actual video stream.

```mermaid
[Browser Extension]  -->  (HTTP Request)  -->  [Local Node Server]  -->  (Spawn Process)  -->  [yt-dlp Core]
```

---

## 🚀 How to Install & Run

### Prerequisites
*   **Node.js** installed on your machine.
*   **yt-dlp** (Should be in your system PATH or installed via pip/brew).

### Step 1: Start the Local Server
The server acts as the bridge between the browser and the downloader core.

1.  Navigate to the `server` folder.
2.  Run the easy start script:
    ```bash
    # Windows
    run-server.bat
    ```
    *Or manually:*
    ```bash
    cd server
    npm install
    node server.js
    ```
3.  Keep this terminal window open (minimized).

### Step 2: Load the Extension
1.  Open Chrome and go to `chrome://extensions`.
2.  Enable **Developer Mode** (top right toggle).
3.  Click **Load Unpacked**.
4.  Select the main folder (`yt-downloader`) of this project.

### Step 3: Usage
1.  Go to any video (e.g., YouTube or Instagram).
2.  Click the **StreamSaver** icon in your toolbar.
3.  Wait for it to analyze the link.
4.  Select **Format** (MP4/MP3) and **Quality**.
5.  Click **Download Direct**.

---

## 📸 Screenshots
*(Add your screenshots here)*

---

## 🤝 Troubleshooting

**Q: "Server Error" in the popup?**
A: Make sure the black terminal window (Local Server) is running.

**Q: Download stuck at 0%?**
A: Check the server console log for errors. It might be a network issue or an unsupported link.

---

## 👨‍💻 Tech Stack
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (Manifest V3)
*   **Backend:** Node.js, Express.js
*   **Core:** yt-dlp (Python-based)
*   **Communication:** REST API (Fetch)

---

**Made for Educational Purposes.**