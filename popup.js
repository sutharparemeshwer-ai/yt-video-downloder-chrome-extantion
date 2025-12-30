document.addEventListener('DOMContentLoaded', () => {
    const loadingDiv = document.getElementById('loading');
    const videoContent = document.getElementById('video-content');
    const errorContent = document.getElementById('error-content');
    
    const thumbnailImg = document.getElementById('video-thumbnail');
    const titleText = document.getElementById('video-title');
    const downloadBtn = document.getElementById('download-btn');
    const formatSelect = document.getElementById('format-select');
    const statusText = document.getElementById('status-text');

    let currentVideoUrl = '';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        
        if (activeTab.url.includes("youtube.com/watch")) {
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['content.js']
            }, () => {
                chrome.tabs.sendMessage(activeTab.id, { action: "GET_VIDEO_INFO" }, (response) => {
                    if (chrome.runtime.lastError || !response || !response.success) {
                        showError();
                    } else {
                        showVideo(response);
                    }
                });
            });
        } else {
            showError();
        }
    });

    function showVideo(data) {
        loadingDiv.classList.add('hidden');
        errorContent.classList.add('hidden');
        videoContent.classList.remove('hidden');

        titleText.textContent = data.title;
        thumbnailImg.src = data.thumbnail;
        currentVideoUrl = data.url;
    }

    function showError() {
        loadingDiv.classList.add('hidden');
        videoContent.classList.add('hidden');
        errorContent.classList.remove('hidden');
    }

    downloadBtn.addEventListener('click', () => {
        if (!currentVideoUrl) return;

        const format = formatSelect.value;
        updateStatus(`Processing ${format.toUpperCase()}...`, 'normal');
        downloadBtn.disabled = true;

        chrome.runtime.sendMessage({
            action: "DOWNLOAD_VIDEO",
            url: currentVideoUrl,
            format: format
        }, (response) => {
            if (chrome.runtime.lastError) {
                updateStatus('Extension Error: ' + chrome.runtime.lastError.message, 'error');
            } else if (response && response.success) {
                updateStatus('Download Started!', 'success');
            } else {
                updateStatus('Error: ' + (response ? response.error : 'Unknown'), 'error');
            }
            downloadBtn.disabled = false;
        });
    });

    function updateStatus(msg, type) {
        statusText.textContent = msg;
        statusText.style.color = type === 'error' ? '#ff4444' : (type === 'success' ? '#44ff44' : '#aaa');
    }
});