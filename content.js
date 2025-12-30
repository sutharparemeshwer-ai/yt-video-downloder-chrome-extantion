// content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_VIDEO_INFO") {
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('v');

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