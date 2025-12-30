const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Serve downloaded files statically
app.use('/files', express.static(path.join(__dirname, 'downloads')));

// In-memory job store
const jobs = {};

// 1. Start a Download Job
app.get('/start-download', (req, res) => {
    const videoUrl = req.query.url;
    const format = req.query.format || 'mp4';
    const quality = req.query.quality || 'best';

    if (!videoUrl) {
        return res.status(400).json({ error: 'Missing URL' });
    }

    const jobId = Date.now().toString();
    const outputTemplate = path.join(__dirname, 'downloads', `${jobId}.%(ext)s`);

    jobs[jobId] = {
        id: jobId,
        status: 'processing',
        videoUrl,
        startTime: Date.now()
    };

    console.log(`[Job ${jobId}] Starting download for ${videoUrl} (${quality})`);

    // Build args
    let args = [];
    
    if (format === 'mp3') {
        args = [
            '-f', 'bestaudio',
            '-x', '--audio-format', 'mp3',
            '-o', outputTemplate,
            videoUrl
        ];
    } else {
        // Video Quality Logic
        // We use the "download and merge" capability of yt-dlp now.
        // This automatically handles merging video+audio for 1080p+.
        
        let formatSelector = 'bestvideo+bestaudio/best'; // Default: Best possible (usually 1080p+ merged)

        if (quality === '720') {
             // Best video <= 720p + Best Audio
             formatSelector = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
        } else if (quality === '360') {
             // Best video <= 360p + Best Audio
             formatSelector = 'bestvideo[height<=360]+bestaudio/best[height<=360]';
        }
        // If 'best', we leave it as default (bestvideo+bestaudio)

        // Force MP4 container if the user requested video
        args = [
            '-f', formatSelector,
            '--merge-output-format', 'mp4',
            '-o', outputTemplate,
            videoUrl
        ];
    }

    // Spawn the process
    const child = spawn('yt-dlp', args);

    child.stdout.on('data', (data) => {
        // Optional: Parse progress from stdout
        // console.log(`[Job ${jobId}] stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
        console.error(`[Job ${jobId}] stderr: ${data}`);
    });

    child.on('close', (code) => {
        console.log(`[Job ${jobId}] Process exited with code ${code}`);
        if (code === 0) {
            // Find the file that was created
            const dir = path.join(__dirname, 'downloads');
            fs.readdir(dir, (err, files) => {
                if (err) {
                    jobs[jobId].status = 'error';
                    jobs[jobId].error = 'File system error';
                    return;
                }

                // Find file starting with jobId
                const file = files.find(f => f.startsWith(jobId));
                if (file) {
                    jobs[jobId].status = 'completed';
                    jobs[jobId].filename = file;
                    jobs[jobId].downloadUrl = `http://localhost:3000/files/${file}`;
                } else {
                    jobs[jobId].status = 'error';
                    jobs[jobId].error = 'Output file not found';
                }
            });
        } else {
            jobs[jobId].status = 'error';
            jobs[jobId].error = 'Download failed (yt-dlp error)';
        }
    });

    // Respond immediately with Job ID
    res.json({ success: true, jobId });
});

// 2. Check Job Status
app.get('/status', (req, res) => {
    const jobId = req.query.jobId;
    if (!jobs[jobId]) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(jobs[jobId]);
});

// Cleanup old files (Optional, basic implementation)
setInterval(() => {
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();
    const dir = path.join(__dirname, 'downloads');
    
    // Clean memory
    for (const id in jobs) {
        if (now - jobs[id].startTime > oneHour) {
            delete jobs[id];
        }
    }

    // Clean files
    fs.readdir(dir, (err, files) => {
        if (!err) {
            files.forEach(file => {
                const filePath = path.join(dir, file);
                fs.stat(filePath, (err, stats) => {
                    if (!err && now - stats.mtimeMs > oneHour) {
                        fs.unlink(filePath, () => {});
                    }
                });
            });
        }
    });
}, 1000 * 60 * 15); // Run every 15 mins

app.listen(port, () => {
    console.log(`StreamSaver Local Server running at http://localhost:${port}`);
    console.log(`Files will be saved to: ${path.join(__dirname, 'downloads')}`);
});