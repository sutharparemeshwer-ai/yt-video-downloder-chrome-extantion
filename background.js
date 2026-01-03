// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "DOWNLOAD_VIDEO") {
        startDownloadJob(request.url, request.format, request.quality, sendResponse);
        return true; // Async response
    }
});

// Alarm Listener for Polling
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith("poll_")) {
        const jobId = alarm.name.replace("poll_", "");
        checkStatus(jobId);
    }
});

async function startDownloadJob(videoUrl, format, quality, sendResponse) {
    const localApi = 'http://localhost:3000';

    try {
        console.log(`Starting Job for: ${videoUrl} [${format}/${quality}]`);

        const cookies = await chrome.cookies.getAll({ domain: "youtube.com" });
        
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
        
        sendResponse({ success: true, jobId: jobId });

        // Use Alarms for robust polling (every 0.5 minutes = 30 seconds minimum in some browsers, 
        // but for unpacked extensions it can be faster. We will use a hybrid approach)
        
        // 1. Initial fast check via setTimeout (for quick downloads)
        setTimeout(() => checkStatus(jobId), 1000);
        
        // 2. Setup Alarm for long-term polling
        chrome.alarms.create(`poll_${jobId}`, { periodInMinutes: 0.1 }); // Check every 6s

    } catch (e) {
        console.error("Local Server Error:", e);
        sendResponse({ 
            success: false, 
            error: `Server Error: ${e.message}. Is the server running?` 
        });
    }
}

async function checkStatus(jobId) {
    const localApi = 'http://localhost:3000';
    try {
        const res = await fetch(`${localApi}/status?jobId=${jobId}`);
        if (!res.ok) {
            chrome.alarms.clear(`poll_${jobId}`);
            return;
        }

        const data = await res.json();

        if (data.status === 'completed') {
            chrome.alarms.clear(`poll_${jobId}`);
            
            // Download Result
            chrome.downloads.download({
                url: data.downloadUrl,
                filename: data.filename
            });
            console.log(`Job ${jobId} Completed and Downloaded.`);
            
        } else if (data.status === 'error') {
            chrome.alarms.clear(`poll_${jobId}`);
            console.error("Background Download Error:", data.error);
        }
        // If 'processing', do nothing, wait for next alarm
        
    } catch (e) {
        // Network error? Keep retrying.
        console.error("Polling Error:", e);
    }
}