const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const app = express();
const port = 3000;

// Determine Root Directory (Handles 'pkg' snapshot vs local node)
const isPkg = typeof process.pkg !== 'undefined';
const ROOT_DIR = isPkg ? path.dirname(process.execPath) : __dirname;

// Ensure downloads directory exists
const downloadsDir = path.join(ROOT_DIR, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Serve downloaded files statically
app.use('/files', express.static(path.join(ROOT_DIR, 'downloads')));

// Status Check for Browser/User
app.get('/', (req, res) => {
    res.send('StreamSaver Server is Running! 🟢<br>You can close this tab and use the extension.');
});

app.get('/video-info', (req, res) => {
    res.status(405).send('Method Not Allowed. This endpoint expects a POST request from the extension.');
});

// In-memory job store
const jobs = {};

// Helper: Get yt-dlp path
function getYtDlpPath() {
    const localBin = path.join(ROOT_DIR, 'bin', 'yt-dlp.exe');
    const localRoot = path.join(ROOT_DIR, 'yt-dlp.exe');
    const appDataBin = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'StreamSaver', 'bin', 'yt-dlp.exe') : null;
    
    if (fs.existsSync(localBin)) return localBin;
    if (fs.existsSync(localRoot)) return localRoot;
    if (appDataBin && fs.existsSync(appDataBin)) return appDataBin;
    return 'yt-dlp';
}

// 0. NEW: Get Video Info (Universal Support)
app.post('/video-info', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });

    console.log(`Fetching info for: ${url}`);
    
    const ytDlpPath = getYtDlpPath();

    // Run yt-dlp to get JSON metadata
    // --flat-playlist: If it's a playlist, just get info, don't list all videos (faster)
    const args = ['-J', '--flat-playlist', '--no-warnings', url];

    const child = spawn(ytDlpPath, args);
    let output = '';
    let errorOutput = '';

    child.on('error', (err) => {
        console.error('Failed to start yt-dlp process:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Failed to start yt-dlp. Is it installed?' });
        }
    });

    child.stdout.on('data', (data) => output += data.toString());
    child.stderr.on('data', (data) => errorOutput += data.toString());

    child.on('close', (code) => {
        if (code !== 0) {
            console.error('Info fetch failed:', errorOutput);
            return res.status(500).json({ success: false, error: 'Not a supported video link' });
        }

        try {
            const data = JSON.parse(output);
            
            // Detect Playlist
            const isPlaylist = data._type === 'playlist' || (data.entries && data.entries.length > 0);
            
            res.json({
                success: true,
                title: data.title || 'Unknown Video',
                thumbnail: data.thumbnail || '',
                url: data.webpage_url || url,
                site: data.extractor_key || 'Unknown Site',
                isPlaylist: isPlaylist,
                videoCount: isPlaylist ? (data.playlist_count || data.entries?.length || 'Unknown') : 1
            });
        } catch (e) {
            res.status(500).json({ success: false, error: 'Failed to parse video info' });
        }
    });
});

// 1. Start a Download Job
app.post('/start-download', (req, res) => {
    const { url: videoUrl, format = 'mp4', quality = 'best', cookies } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'Missing URL' });
    }

    const jobId = Date.now().toString();
    const cookieFilePath = path.join(ROOT_DIR, 'downloads', `cookies-${jobId}.txt`);

    // Prepare Cookie File if cookies are provided
    let hasCookies = false;
    if (cookies && Array.isArray(cookies)) {
        try {
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
            totalSize: 'Starting...', 
            speed: '0 MiB/s',
            eta: '--:--'
        }
    };

    console.log(`[Job ${jobId}] Starting download for ${videoUrl} (${quality})`);

    // --- DETERMINE IF PLAYLIST OR SINGLE ---
    // We check via a quick flag or just logic. 
    // To be safe, we rely on how we process it. 
    // But since the frontend knows, maybe we should have accepted 'isPlaylist' param.
    // However, yt-dlp handles both. But for ZIP logic, we need to know.
    // Let's assume it *might* be a playlist if the user sent it, 
    // but the safest way is to output to a specific FOLDER if it is a playlist.
    // We will use a folder-based approach for EVERYTHING to be unified?
    // No, single files are faster to just download directly.
    
    // We'll trust the user wants what they pasted.
    // We'll assume everything is a potential playlist if we use a folder, 
    // but we need to know if we should ZIP it.
    // Let's check the URL again? No, too slow. 
    // Let's look at the request body again. 
    // Recommendation: Frontend sends 'isPlaylist' flag.
    // Implementation: I'll assume the frontend will send `isPlaylist`. 
    // If not present, I'll default to False, but if yt-dlp creates multiple files, we might miss them.
    // Better: We always download to a temp folder, then check content count. 
    
    // NEW STRATEGY: ALWAYS DOWNLOAD TO SUBFOLDER, THEN MOVE OR ZIP.
    const jobFolder = path.join(ROOT_DIR, 'downloads', jobId + '_temp');
    if (!fs.existsSync(jobFolder)) fs.mkdirSync(jobFolder);

    let outputTemplate = path.join(jobFolder, '%(title)s.%(ext)s');

    // Build args
    let args = [];
    let commonArgs = [];
    if (hasCookies) {
        commonArgs.push('--cookies', cookieFilePath);
    }
    
    // Speed Optimization: Concurrent fragments
    commonArgs.push('-N', '8');

    if (format === 'mp3') {
        args = [
            ...commonArgs,
            '-f', 'bestaudio',
            '-x', '--audio-format', 'mp3',
            '-o', outputTemplate,
            videoUrl
        ];
    } else {
        let formatSelector = 'bestvideo+bestaudio/best'; 
        const isShorts = videoUrl.includes('/shorts/');
        if (isShorts) {
             formatSelector = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
        } else {
            if (quality === '720') formatSelector = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
            else if (quality === '360') formatSelector = 'bestvideo[height<=360]+bestaudio/best[height<=360]';
        }

        args = [
            ...commonArgs,
            '-f', formatSelector,
            '--merge-output-format', 'mp4',
            '-o', outputTemplate,
            videoUrl
        ];
    }

    const ytDlpPath = getYtDlpPath();
    const child = spawn(ytDlpPath, args);

    child.on('error', (err) => {
        console.error(`[Job ${jobId}] Failed to start yt-dlp process:`, err);
        jobs[jobId].status = 'error';
        jobs[jobId].error = 'Failed to start downloader process';
    });

    child.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Playlist Progress Parsing: [download] Downloading video 3 of 15
        const playlistMatch = output.match(/Downloading video (\d+) of (\d+)/);
        if (playlistMatch) {
            jobs[jobId].progressData.percent = `Video ${playlistMatch[1]}/${playlistMatch[2]}`;
        }

        // Standard Progress Parsing
        const progressMatch = output.match(/\[download\]\s+(\d+\.\d+)%\s+of\s+([~\d\.\w]+)\s+at\s+([\d\.\w\/]+)\s+ETA\s+([\d:]+)/);
        if (progressMatch) {
            jobs[jobId].progress = parseFloat(progressMatch[1]);
            // If inside a playlist, show detailed status
            if (jobs[jobId].progressData.percent.includes('Video')) {
                 // Keep "Video X/Y" but update speed
                 jobs[jobId].progressData.speed = progressMatch[3];
                 jobs[jobId].progressData.eta = progressMatch[4];
            } else {
                jobs[jobId].progressData = {
                    percent: progressMatch[1] + '%',
                    totalSize: progressMatch[2].replace('MiB', 'MB').replace('KiB', 'KB'),
                    speed: progressMatch[3].replace('MiB', 'MB').replace('KiB', 'KB'),
                    eta: progressMatch[4]
                };
            }
        }
    });

    child.stderr.on('data', (data) => {
        const errStr = data.toString();
        if (errStr.includes('ERROR:')) {
            console.error(`[Job ${jobId}] stderr: ${data}`);
        }
    });

    child.on('close', async (code) => {
        console.log(`[Job ${jobId}] Process exited with code ${code}`);
        
        // Clean cookie
        if (jobs[jobId].cookieFile && fs.existsSync(jobs[jobId].cookieFile)) {
            try { fs.unlinkSync(jobs[jobId].cookieFile); } catch(e) {}
        }

        if (code === 0) {
            // Check files in folder
            fs.readdir(jobFolder, async (err, files) => {
                if (err || files.length === 0) {
                    jobs[jobId].status = 'error';
                    jobs[jobId].error = 'No files downloaded';
                    return;
                }

                // If multiple files OR explicit playlist request -> ZIP
                // If single file -> Move and Serve
                if (files.length > 1) {
                    // ZIP IT
                    jobs[jobId].progressData.percent = 'Zipping...';
                    const zipName = `${jobId}_playlist.zip`;
                    const zipPath = path.join(downloadsDir, zipName);
                    
                    const output = fs.createWriteStream(zipPath);
                    const archive = archiver('zip', { zlib: { level: 9 } });

                    output.on('close', () => {
                         // Zip done, delete temp folder
                         fs.rm(jobFolder, { recursive: true, force: true }, () => {});
                         
                         jobs[jobId].status = 'completed';
                         jobs[jobId].filename = zipName;
                         jobs[jobId].downloadUrl = `http://localhost:3000/files/${zipName}`;
                    });

                    archive.on('error', (err) => {
                        jobs[jobId].status = 'error';
                        jobs[jobId].error = 'Zipping failed';
                    });

                    archive.pipe(output);
                    archive.directory(jobFolder, false);
                    archive.finalize();

                } else {
                    // Single File -> Move to root downloads
                    const oldPath = path.join(jobFolder, files[0]);
                    const newPath = path.join(downloadsDir, files[0]);
                    
                    // Rename (Move)
                    fs.rename(oldPath, newPath, (err) => {
                        if (err) {
                             jobs[jobId].status = 'error';
                             jobs[jobId].error = 'File move failed';
                        } else {
                             // Remove temp folder
                             fs.rmdir(jobFolder, () => {});

                             jobs[jobId].status = 'completed';
                             jobs[jobId].filename = files[0];
                             jobs[jobId].downloadUrl = `http://localhost:3000/files/${files[0]}`;
                        }
                    });
                }
            });
        } else {
            jobs[jobId].status = 'error';
            jobs[jobId].error = 'Download failed (yt-dlp error)';
            // Cleanup temp folder
            fs.rm(jobFolder, { recursive: true, force: true }, () => {});
        }
    });

    // Respond immediately
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

// Cleanup old files
setInterval(() => {
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();
    
    // Clean memory
    for (const id in jobs) {
        if (now - jobs[id].startTime > oneHour) delete jobs[id];
    }

    // Clean files
    fs.readdir(downloadsDir, (err, files) => {
        if (!err) {
            files.forEach(file => {
                const filePath = path.join(downloadsDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (!err && stats.isFile() && now - stats.mtimeMs > oneHour) {
                        fs.unlink(filePath, () => {});
                    }
                });
            });
        }
    });
}, 1000 * 60 * 15);

app.listen(port, () => {
    console.log(`StreamSaver Local Server running at http://localhost:${port}`);
    console.log(`Files will be saved to: ${path.join(ROOT_DIR, 'downloads')}`);
});
