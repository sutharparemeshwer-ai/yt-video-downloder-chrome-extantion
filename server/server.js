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
app.post('/start-download', (req, res) => {
    const { url: videoUrl, format = 'mp4', quality = 'best', cookies } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'Missing URL' });
    }

    const jobId = Date.now().toString();
    const outputTemplate = path.join(__dirname, 'downloads', `${jobId}.%(ext)s`);
    const cookieFilePath = path.join(__dirname, 'downloads', `cookies-${jobId}.txt`);

    // Prepare Cookie File if cookies are provided
    let hasCookies = false;
    if (cookies && Array.isArray(cookies)) {
        try {
            // Convert Chrome cookie object to Netscape format
            // Domain | Flag | Path | Secure | Expiration | Name | Value
            const cookieContent = cookies.map(c => {
                const domain = c.domain;
                const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
                const path = c.path;
                const secure = c.secure ? 'TRUE' : 'FALSE';
                const expiration = c.expirationDate ? Math.round(c.expirationDate) : 0;
                const name = c.name;
                const value = c.value;
                return `${domain}\t${flag}\t${path}\t${secure}\t${expiration}\t${name}\t${value}`;
            }).join('\n');
            
            fs.writeFileSync(cookieFilePath, '# Netscape HTTP Cookie File\n' + cookieContent);
            hasCookies = true;
        } catch (err) {
            console.error(`[Job ${jobId}] Failed to write cookie file:`, err);
        }
    }

    jobs[jobId] = {
        id: jobId,
        status: 'processing',
        videoUrl,
        startTime: Date.now(),
        cookieFile: hasCookies ? cookieFilePath : null,
        progress: 0,
        progressData: {
            percent: '0%',
            totalSize: 'Calculating...',
            speed: '0 MiB/s',
            eta: '--:--'
        }
    };

    console.log(`[Job ${jobId}] Starting download for ${videoUrl} (${quality})`);

    // Build args
    let args = [];
    
    // Common Args
    let commonArgs = [];
    if (hasCookies) {
        commonArgs.push('--cookies', cookieFilePath);
    }

    if (format === 'mp3') {
        args = [
            ...commonArgs,
            '-f', 'bestaudio',
            '-x', '--audio-format', 'mp3',
            '-o', outputTemplate,
            videoUrl
        ];
    } else {
        // Video Quality Logic
        let formatSelector = 'bestvideo+bestaudio/best'; 

        // Smart Logic for SHORTS
        const isShorts = videoUrl.includes('/shorts/');
        
        if (isShorts) {
             console.log(`[Job ${jobId}] Detected Shorts. Optimizing for size...`);
             // Limit Shorts to 1080p to avoid massive file sizes (usually keeps it under 50MB)
             formatSelector = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
        } else {
            // Normal Video Logic
            if (quality === '720') {
                 formatSelector = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
            } else if (quality === '360') {
                 formatSelector = 'bestvideo[height<=360]+bestaudio/best[height<=360]';
            }
        }

        args = [
            ...commonArgs,
            '-f', formatSelector,
            '--merge-output-format', 'mp4',
            '-o', outputTemplate,
            videoUrl
        ];
    }

    // Spawn the process
    const child = spawn('yt-dlp', args);

    child.stdout.on('data', (data) => {
        const output = data.toString();
        // Regex to match: [download]  23.5% of 10.00MiB at  2.00MiB/s ETA 00:05
        const progressMatch = output.match(/\[download\]\s+(\d+\.\d+)%\s+of\s+([~\d\.\w]+)\s+at\s+([\d\.\w\/]+)\s+ETA\s+([\d:]+)/);
        
        if (progressMatch) {
            jobs[jobId].progress = parseFloat(progressMatch[1]);
            jobs[jobId].progressData = {
                percent: progressMatch[1] + '%',
                totalSize: progressMatch[2].replace('MiB', 'MB').replace('KiB', 'KB'),
                speed: progressMatch[3].replace('MiB', 'MB').replace('KiB', 'KB'),
                eta: progressMatch[4]
            };
        }
    });

    child.stderr.on('data', (data) => {
        // Only log actual errors, not warnings
        const errStr = data.toString();
        if (errStr.includes('ERROR:')) {
            console.error(`[Job ${jobId}] stderr: ${data}`);
        }
    });

    child.on('close', (code) => {
        console.log(`[Job ${jobId}] Process exited with code ${code}`);
        
        // Clean up cookie file
        if (jobs[jobId].cookieFile && fs.existsSync(jobs[jobId].cookieFile)) {
            try { fs.unlinkSync(jobs[jobId].cookieFile); } catch(e) {}
        }

        if (code === 0) {
            // Find the file that was created
            const dir = path.join(__dirname, 'downloads');
            fs.readdir(dir, (err, files) => {
                if (err) {
                    jobs[jobId].status = 'error';
                    jobs[jobId].error = 'File system error';
                    return;
                }

                // Find file starting with jobId (excluding cookie files)
                const file = files.find(f => f.startsWith(jobId) && !f.includes('cookies'));
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