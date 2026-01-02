// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "DOWNLOAD_VIDEO") {
        startDownloadJob(request.url, request.format, request.quality, sendResponse);
        return true; // Async response
    }
});

async function startDownloadJob(videoUrl, format, quality, sendResponse) {
    const localApi = 'http://localhost:3000';

    try {
        console.log(`Starting Job for: ${videoUrl} [${format}/${quality}]`);

        // 0. Get Cookies from Browser
        const cookies = await chrome.cookies.getAll({ domain: "youtube.com" });
        
        // 1. Start Job (POST request now)
        const startRes = await fetch(`${localApi}/start-download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: videoUrl,
                format: format,
                quality: quality,
                cookies: cookies
            })
        });

        if (!startRes.ok) throw new Error('Failed to start download job');
        
        const startData = await startRes.json();
        if (!startData.success) throw new Error(startData.error || 'Unknown error starting job');

        const jobId = startData.jobId;
        console.log(`Job Started: ${jobId}. Polling...`);
        
        // Return Job ID immediately to Popup so it can track progress
        sendResponse({ success: true, jobId: jobId });

        // 2. Poll Status (in background to trigger download when done)
        pollStatus(jobId);

    } catch (e) {
        console.error("Local Server Error:", e);
        sendResponse({ 
            success: false, 
            error: `Server Error: ${e.message}. Is the server running?` 
        });
    }
}

function pollStatus(jobId) {
    const localApi = 'http://localhost:3000';
    const interval = 1000; // Check every second

    const poller = setInterval(async () => {
        try {
            const res = await fetch(`${localApi}/status?jobId=${jobId}`);
            if (!res.ok) {
                clearInterval(poller);
                return;
            }

            const data = await res.json();

            if (data.status === 'completed') {
                clearInterval(poller);
                // 3. Download Result
                chrome.downloads.download({
                    url: data.downloadUrl,
                    filename: data.filename
                });
            } else if (data.status === 'error') {
                clearInterval(poller);
                console.error("Background Download Error:", data.error);
            }
            // If 'processing', continue polling

        } catch (e) {
            clearInterval(poller);
            console.error("Background Polling Error:", e);
        }
    }, interval);
}