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
        
        // 1. Start Job
        const startRes = await fetch(`${localApi}/start-download?url=${encodeURIComponent(videoUrl)}&format=${format}&quality=${quality}`);
        if (!startRes.ok) throw new Error('Failed to start download job');
        
        const startData = await startRes.json();
        if (!startData.success) throw new Error(startData.error || 'Unknown error starting job');

        const jobId = startData.jobId;
        console.log(`Job Started: ${jobId}. Polling...`);

        // 2. Poll Status
        pollStatus(jobId, sendResponse);

    } catch (e) {
        console.error("Local Server Error:", e);
        sendResponse({ 
            success: false, 
            error: `Server Error: ${e.message}. Is the server running?` 
        });
    }
}

function pollStatus(jobId, sendResponse) {
    const localApi = 'http://localhost:3000';
    const interval = 2000; // 2 seconds

    const poller = setInterval(async () => {
        try {
            const res = await fetch(`${localApi}/status?jobId=${jobId}`);
            if (!res.ok) {
                clearInterval(poller);
                sendResponse({ success: false, error: 'Failed to check status' });
                return;
            }

            const data = await res.json();
            console.log(`Job ${jobId} Status: ${data.status}`);

            if (data.status === 'completed') {
                clearInterval(poller);
                // 3. Download Result
                chrome.downloads.download({
                    url: data.downloadUrl,
                    filename: data.filename // Use the filename from server
                }, (id) => {
                    sendResponse({ success: true, downloadId: id });
                });
            } else if (data.status === 'error') {
                clearInterval(poller);
                sendResponse({ success: false, error: data.error || 'Download failed on server' });
            }
            // If 'processing', continue polling

        } catch (e) {
            clearInterval(poller);
            sendResponse({ success: false, error: 'Polling error: ' + e.message });
        }
    }, interval);
}