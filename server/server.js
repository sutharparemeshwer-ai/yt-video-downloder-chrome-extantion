const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Endpoint to get the direct download link
app.get('/download', (req, res) => {
    const videoUrl = req.query.url;
    const format = req.query.format || 'mp4'; // 'mp4' or 'mp3'

    if (!videoUrl) {
        return res.status(400).json({ error: 'Missing URL' });
    }

    console.log(`Processing: ${videoUrl} (${format})`);

    // Command to get the direct link
    // -f best[ext=mp4] gets the best MP4 video with audio
    // -f bestaudio gets the best audio
    // -g flag tells yt-dlp to just print the URL, not download it yet
    let command = '';
    
    if (format === 'mp3') {
        command = `yt-dlp -f bestaudio -g "${videoUrl}"`;
    } else {
        // Get best video that has audio (usually 720p/360p direct link)
        command = `yt-dlp -f "best[ext=mp4]/best" -g "${videoUrl}"`;
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            // Fallback: If user doesn't have yt-dlp installed, warn them
            return res.status(500).json({ 
                error: 'yt-dlp failed. Make sure yt-dlp is installed and in your PATH.',
                details: stderr 
            });
        }

        const downloadLink = stdout.trim();
        if (downloadLink) {
            console.log('Link found!');
            res.json({ url: downloadLink });
        } else {
            res.status(404).json({ error: 'No link found.' });
        }
    });
});

app.listen(port, () => {
    console.log(`StreamSaver Local Server running at http://localhost:${port}`);
    console.log(`Keep this window open while using the extension.`);
});