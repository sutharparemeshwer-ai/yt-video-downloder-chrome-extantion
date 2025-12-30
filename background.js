// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "DOWNLOAD_VIDEO") {
        processLocal(request.url, request.format, sendResponse);
        return true; 
    }
});

async function processLocal(videoUrl, format, sendResponse) {
    const localApi = 'http://localhost:3000/download';

    try {
        console.log(`Asking Local Server for: ${videoUrl}`);
        
        const response = await fetch(`${localApi}?url=${encodeURIComponent(videoUrl)}&format=${format}`);
        
        if (!response.ok) {
            const json = await response.json();
            throw new Error(json.error || 'Server Error');
        }

        const data = await response.json();

        if (data.url) {
            chrome.downloads.download({
                url: data.url,
                filename: `StreamSaver_${Date.now()}.${format === 'mp3' ? 'mp3' : 'mp4'}`
            }, (id) => {
                sendResponse({ success: true, downloadId: id });
            });
        } else {
            throw new Error('Server returned no URL.');
        }

    } catch (e) {
        console.error("Local Server Error:", e);
        sendResponse({ 
            success: false, 
            error: `Make sure the local server is running! (Error: ${e.message})` 
        });
    }
}