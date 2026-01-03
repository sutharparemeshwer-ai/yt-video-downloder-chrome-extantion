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
    let currentVideoUrl = '';

    // --- Custom Dropdown Setup ---
    function setupCustomSelect(id, onChange) {
        const container = document.getElementById(id);
        const trigger = container.querySelector('.select-trigger');
        const optionsContainer = container.querySelector('.select-options');
        const options = container.querySelectorAll('.option');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select').forEach(cs => {
                if (cs !== container) cs.classList.remove('open');
            });
            container.classList.toggle('open');
        });

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                const value = opt.getAttribute('data-value');
                trigger.textContent = opt.textContent;
                trigger.setAttribute('data-value', value);
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                container.classList.remove('open');
                if (onChange) onChange(value);
            });
        });
    }

    setupCustomSelect('format-custom', (val) => {
        selectedFormat = val;
        if (val === 'mp3') qualityControl.classList.add('hidden');
        else qualityControl.classList.remove('hidden');
    });

    setupCustomSelect('quality-custom', (val) => { selectedQuality = val; });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select').forEach(cs => cs.classList.remove('open'));
    });
    // -----------------------------

    // 1. Get Current Tab URL & Fetch Info from Server
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        
        if (activeTab && activeTab.url && activeTab.url.startsWith('http')) {
            currentVideoUrl = activeTab.url;
            fetchVideoInfo(currentVideoUrl);
        } else {
            showError("Cannot download from this page.");
        }
    });

    async function fetchVideoInfo(url) {
        // Show loading state
        loadingDiv.classList.remove('hidden');
        videoContent.classList.add('hidden');
        errorContent.classList.add('hidden');
        
        // Update loading text
        loadingDiv.querySelector('p').textContent = "Analyzing Link...";

        try {
            const response = await fetch('http://localhost:3000/video-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (data.success) {
                showVideo(data);
            } else {
                showError(data.error || "No video found on this page.");
            }
        } catch (error) {
            console.error(error);
            showError("Server Error. Is the local app running?");
        }
    }

    function showVideo(data) {
        loadingDiv.classList.add('hidden');
        videoContent.classList.remove('hidden');

        titleText.textContent = data.title;
        // Use a placeholder if thumbnail is missing (common for non-YouTube sites)
        thumbnailImg.src = data.thumbnail || 'icons/icon128.png';
        
        // Adjust thumbnail styling for vertical videos (like Reels/Shorts)
        thumbnailImg.style.objectFit = 'cover';
        thumbnailImg.style.maxHeight = '180px';

        // NEW: Playlist Logic
        if (data.isPlaylist) {
            downloadBtn.textContent = `Download Playlist (${data.videoCount} Videos) - ZIP`;
            // Add a small badge or note?
            titleText.textContent = `[Playlist] ${data.title}`;
        } else {
            downloadBtn.textContent = 'Download Direct';
        }
    }

    function showError(msg) {
        loadingDiv.classList.add('hidden');
        videoContent.classList.add('hidden');
        errorContent.classList.remove('hidden');
        if(msg) errorContent.querySelector('p').textContent = msg;
    }

    // --- Download Logic ---
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    downloadBtn.addEventListener('click', () => {
        if (!currentVideoUrl) return;

        updateStatus(`Requesting download...`, 'normal');
        downloadBtn.disabled = true;
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = 'Queueing...';

        chrome.runtime.sendMessage({
            action: "DOWNLOAD_VIDEO",
            url: currentVideoUrl,
            format: selectedFormat,
            quality: selectedQuality
        }, (response) => {
            if (chrome.runtime.lastError) {
                updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                downloadBtn.disabled = false;
            } else if (response && response.success) {
                trackProgress(response.jobId);
            } else {
                updateStatus('Error: ' + (response ? response.error : 'Unknown'), 'error');
                downloadBtn.disabled = false;
            }
        });
    });

    function trackProgress(jobId) {
        const localApi = 'http://localhost:3000';
        const tracker = setInterval(async () => {
            try {
                const res = await fetch(`${localApi}/status?jobId=${jobId}`);
                if (!res.ok) return;

                const data = await res.json();

                if (data.status === 'processing') {
                    if (data.progressData) {
                        let { percent, totalSize, speed, eta } = data.progressData;
                        
                        // Handle Playlist "Video X/Y" format
                        if (percent.toString().includes('Video')) {
                            // Format: "Video 1/5"
                            const parts = percent.split('/'); // ["Video 1", "5"]
                            if (parts.length === 2) {
                                const current = parseInt(parts[0].replace(/\D/g, ''));
                                const total = parseInt(parts[1]);
                                if (total > 0) {
                                    const percentage = (current / total) * 100;
                                    progressBar.style.width = `${percentage}%`;
                                }
                            }
                            progressText.textContent = `${percent} • ${speed}`;
                            updateStatus('Downloading Playlist...', 'normal');
                        } else if (percent === 'Zipping...') {
                             progressBar.style.width = '100%';
                             progressBar.style.backgroundColor = '#FFD700'; // Gold color for zipping
                             progressText.textContent = 'Compressing files...';
                             updateStatus('Zipping Playlist...', 'normal');
                        } else {
                            // Standard Download
                            progressBar.style.width = percent;
                            progressText.textContent = `${percent} • ${totalSize} • ${speed}`;
                            updateStatus(`Downloading...`, 'normal');
                        }
                    }
                } else if (data.status === 'completed') {
                    clearInterval(tracker);
                    progressBar.style.width = '100%';
                    progressBar.style.backgroundColor = '#44ff44';
                    progressText.textContent = 'Completed!';
                    updateStatus('Saved to Downloads!', 'success');
                    
                    // Failsafe: Trigger download directly from Popup if it's open
                    chrome.downloads.download({
                        url: data.downloadUrl,
                        filename: data.filename
                    });

                    downloadBtn.disabled = false;
                    setTimeout(() => { 
                        progressContainer.classList.add('hidden'); 
                        progressBar.style.backgroundColor = '#cc0000';
                    }, 3000);
                } else if (data.status === 'error') {
                    clearInterval(tracker);
                    progressBar.style.backgroundColor = '#ff4444';
                    updateStatus('Error: ' + data.error, 'error');
                    downloadBtn.disabled = false;
                }
            } catch (e) { console.error(e); }
        }, 1000);
    }

    function updateStatus(msg, type) {
        statusText.textContent = msg;
        statusText.style.color = type === 'error' ? '#ff4444' : (type === 'success' ? '#44ff44' : '#aaa');
    }
});