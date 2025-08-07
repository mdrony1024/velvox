document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const fileCode = params.get('file_code');

    const previewEl = document.getElementById('file-preview');
    const nameEl = document.getElementById('file-name');
    const sizeEl = document.getElementById('file-size');
    const descriptionEl = document.getElementById('file-description');
    const downloadBtn = document.getElementById('download-button');

    if (!fileCode) {
        nameEl.textContent = 'Invalid Link';
        downloadBtn.classList.add('disabled');
        return;
    }
    
    // ব্যাকএন্ড থেকে ফাইলের তথ্য (নাম, সাইজ, ধরন, ডেসক্রিপশন) আনা
    // এর জন্য একটি নতুন API এন্ডপয়েন্ট তৈরি করতে হবে
    fetch(`/api/file-info?file_code=${fileCode}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                nameEl.textContent = data.error;
                return;
            }

            // পেজে তথ্য সেট করা
            nameEl.textContent = data.fileName;
            sizeEl.textContent = `Size: ${formatBytes(data.fileSize)}`;
            
            if (data.description) {
                descriptionEl.textContent = data.description;
            } else {
                descriptionEl.style.display = 'none';
            }

            // ফাইলের ধরন অনুযায়ী প্রিভিউ দেখানো
            if (data.fileType.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = `/api/get-file?file_code=${fileCode}`;
                video.controls = true;
                previewEl.innerHTML = '';
                previewEl.appendChild(video);
            }
            // আপনি চাইলে ইমেজ, অডিও ইত্যাদির জন্যও প্রিভিউ যোগ করতে পারেন

            // ডাউনলোড লিঙ্ক সেট করা এবং বাটন এনাবল করা
            downloadBtn.href = `/api/get-file?file_code=${fileCode}`;
            downloadBtn.download = data.fileName; // এটি ডাউনলোড করার সময় ফাইলের নাম সেট করবে
            downloadBtn.classList.remove('disabled');

        }).catch(err => {
            nameEl.textContent = 'Could not load file details.';
        });
});

// ফাইল সাইজকে KB, MB, GB তে দেখানোর জন্য একটি হেলপার ফাংশন
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
