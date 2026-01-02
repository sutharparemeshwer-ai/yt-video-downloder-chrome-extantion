// content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_VIDEO_INFO") {
        let videoId = null;
        const url = window.location.href;

        if (url.includes('/watch?v=')) {
            const urlParams = new URLSearchParams(window.location.search);
            videoId = urlParams.get('v');
        } else if (url.includes('/shorts/')) {
            const parts = url.split('/shorts/');
            videoId = parts[1].split(/[?#]/)[0]; // Extract ID before any query params
        }

        if (videoId) {
            const title = document.title.replace(' - YouTube', '');
            // High res thumbnail if available, else default
            const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
            const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
            
            sendResponse({
                success: true,
                videoId: videoId,
                title: title,
                thumbnail: thumbnail,
                url: cleanUrl
            });
        } else {
            sendResponse({ success: false });
        }
    }
    return true; // Keep the message channel open for async response
});