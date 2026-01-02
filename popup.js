document.addEventListener('DOMContentLoaded', () => {
    const loadingDiv = document.getElementById('loading');
    const videoContent = document.getElementById('video-content');
    const errorContent = document.getElementById('error-content');
    
    const thumbnailImg = document.getElementById('video-thumbnail');
    const titleText = document.getElementById('video-title');
    const downloadBtn = document.getElementById('download-btn');
    const qualityControl = document.getElementById('quality-control');
    const statusText = document.getElementById('status-text');

    // Values to store selections
    let selectedFormat = 'mp4';
    let selectedQuality = 'best';

    // Custom Dropdown Logic
    function setupCustomSelect(id, onChange) {
        const container = document.getElementById(id);
        const trigger = container.querySelector('.select-trigger');
        const optionsContainer = container.querySelector('.select-options');
        const options = container.querySelectorAll('.option');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other dropdowns first
            document.querySelectorAll('.custom-select').forEach(cs => {
                if (cs !== container) cs.classList.remove('open');
            });
            container.classList.toggle('open');
            optionsContainer.classList.toggle('hidden');
        });

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                const value = opt.getAttribute('data-value');
                const text = opt.textContent;

                // Update trigger
                trigger.textContent = text;
                trigger.setAttribute('data-value', value);

                // Update visual selection
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');

                // Close
                container.classList.remove('open');
                optionsContainer.classList.add('hidden');

                if (onChange) onChange(value);
            });
        });
    }

    // Initialize Dropdowns
    setupCustomSelect('format-custom', (val) => {
        selectedFormat = val;
        if (val === 'mp3') {
            qualityControl.classList.add('hidden');
        } else {
            qualityControl.classList.remove('hidden');
        }
    });

    setupCustomSelect('quality-custom', (val) => {
        selectedQuality = val;
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select').forEach(cs => {
            cs.classList.remove('open');
            cs.querySelector('.select-options').classList.add('hidden');
        });
    });

    let currentVideoUrl = '';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const isYouTubeVideo = activeTab && activeTab.url && (activeTab.url.includes("youtube.com/watch") || activeTab.url.includes("youtube.com/shorts"));
        
        if (isYouTubeVideo) {
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

    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    downloadBtn.addEventListener('click', () => {
        if (!currentVideoUrl) return;

        updateStatus(`Starting...`, 'normal');
        downloadBtn.disabled = true;
        
        // Reset Progress UI
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = 'Initializing...';

        chrome.runtime.sendMessage({
            action: "DOWNLOAD_VIDEO",
            url: currentVideoUrl,
            format: selectedFormat,
            quality: selectedQuality
        }, (response) => {
            if (chrome.runtime.lastError) {
                updateStatus('Extension Error: ' + chrome.runtime.lastError.message, 'error');
                downloadBtn.disabled = false;
            } else if (response && response.success) {
                const jobId = response.jobId;
                trackProgress(jobId);
            } else {
                updateStatus('Error: ' + (response ? response.error : 'Unknown'), 'error');
                downloadBtn.disabled = false;
            }
        });
    });

    function trackProgress(jobId) {
        const localApi = 'http://localhost:3000';
        const interval = 1000;

        const tracker = setInterval(async () => {
            try {
                const res = await fetch(`${localApi}/status?jobId=${jobId}`);
                if (!res.ok) return;

                const data = await res.json();

                if (data.status === 'processing') {
                    if (data.progressData) {
                        const { percent, totalSize, speed, eta } = data.progressData;
                        progressBar.style.width = percent;
                        progressText.textContent = `${percent} • ${totalSize} • ${speed}`;
                        updateStatus(`Downloading... ETA: ${eta}`, 'normal');
                    } else {
                        progressText.textContent = 'Processing on server...';
                    }
                } else if (data.status === 'completed') {
                    clearInterval(tracker);
                    progressBar.style.width = '100%';
                    progressBar.style.backgroundColor = '#44ff44';
                    progressText.textContent = 'Download Complete!';
                    updateStatus('Saved to Downloads!', 'success');
                    downloadBtn.disabled = false;
                } else if (data.status === 'error') {
                    clearInterval(tracker);
                    progressBar.style.backgroundColor = '#ff4444';
                    updateStatus('Error: ' + data.error, 'error');
                    downloadBtn.disabled = false;
                }

            } catch (e) {
                console.error(e);
            }
        }, interval);
    }

    function updateStatus(msg, type) {
        statusText.textContent = msg;
        statusText.style.color = type === 'error' ? '#ff4444' : (type === 'success' ? '#44ff44' : '#aaa');
    }
});