// =========================================
// 1. GET ALL THE HTML ELEMENTS WE NEED
// =========================================

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const editorArea = document.getElementById('editor-area');
const previewImage = document.getElementById('preview-image');
const originalDimensionsEl = document.getElementById('original-dimensions');
const originalFileSizeEl = document.getElementById('original-file-size');
const widthInput = document.getElementById('width-input');
const heightInput = document.getElementById('height-input');
const lockBtn = document.getElementById('lock-btn');
const warningEl = document.getElementById('warning-message');
const resizeBtn = document.getElementById('resize-btn');

// NEW: Result area elements
const resultArea = document.getElementById('result-area');
const resultOriginalImage = document.getElementById('result-original-image');
const resultOriginalDimensions = document.getElementById('result-original-dimensions');
const resultOriginalSize = document.getElementById('result-original-size');
const resultResizedImage = document.getElementById('result-resized-image');
const resultResizedDimensions = document.getElementById('result-resized-dimensions');
const resultResizedSize = document.getElementById('result-resized-size');
const downloadBtn = document.getElementById('download-btn');

// =========================================
// 2. VARIABLES TO REMEMBER THINGS
// =========================================

let originalFile = null;       // The file the user picked
let originalImage = null;      // The loaded image (has width & height)
let originalType = 'image/jpeg';
let aspectRatio = 1;           // original width ÷ original height
let lockEnabled = true;        // Is the ratio lock ON?
let downloadURL = null;        // The link for the finished image

const MAX_SIZE = 10000;        // Safety limit to stop browser crashes

// =========================================
// 3. HELPERS: MESSAGES AND FILE SIZE
// =========================================

function showMessage(text) {
    warningEl.textContent = text;
    warningEl.style.display = 'block';
}

function clearMessage() {
    warningEl.textContent = '';
    warningEl.style.display = 'none';
}

function formatBytes(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Keep a number inside the allowed range
function clamp(value) {
    return Math.min(MAX_SIZE, Math.max(1, value));
}

// =========================================
// 4. FILE SELECTION
// =========================================

uploadArea.addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return; // User pressed Cancel

    // Only accept the three formats we support
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Unsupported format. Please use a JPG, PNG, or WebP image.');
        return;
    }

    originalFile = file;
    originalType = file.type;

    // If there was a previous download, free that memory
    if (downloadURL) {
        URL.revokeObjectURL(downloadURL);
        downloadURL = null;
    }

    // Reset the UI
    resultArea.style.display = 'none'; // Hide previous results
    downloadBtn.style.display = 'none';
    clearMessage();

    // Read the file and load it as an image
    const reader = new FileReader();

    reader.onload = function(event) {
        const img = new Image();

        img.onload = function() {
            originalImage = img;
            aspectRatio = img.width / img.height;

            // Show the preview and file details in the editor
            previewImage.src = event.target.result;
            originalDimensionsEl.textContent = img.width + ' × ' + img.height + ' px';
            originalFileSizeEl.textContent = 'File size: ' + formatBytes(file.size);

            // Put the ORIGINAL size into the inputs as a starting point
            widthInput.value = img.width;
            heightInput.value = img.height;

            // Now show the editor
            editorArea.style.display = 'grid';
        };

        img.onerror = function() {
            alert('This image could not be opened. Please try another file.');
        };

        img.src = event.target.result;
    };

    reader.readAsDataURL(file);
});

// =========================================
// 5. ASPECT RATIO LOCK BUTTON
// =========================================

lockBtn.addEventListener('click', function() {
    lockEnabled = !lockEnabled;

    if (lockEnabled) {
        lockBtn.textContent = '🔒';
        lockBtn.classList.add('locked');
        lockBtn.title = 'Aspect ratio locked — click to unlock';
    } else {
        lockBtn.textContent = '🔓';
        lockBtn.classList.remove('locked');
        lockBtn.title = 'Aspect ratio unlocked — click to lock';
    }
});

// =========================================
// 6. WIDTH & HEIGHT INPUTS
// =========================================

// When the user types a WIDTH, adjust the HEIGHT if locked
widthInput.addEventListener('input', function() {
    if (!lockEnabled || !originalImage) return;

    const newWidth = parseInt(widthInput.value, 10);
    if (!newWidth || newWidth < 1) return; // Wait for a valid number

    const newHeight = Math.round(clamp(newWidth) / aspectRatio);
    heightInput.value = Math.max(1, newHeight);

    checkUpscaling();
});

// When the user types a HEIGHT, adjust the WIDTH if locked
heightInput.addEventListener('input', function() {
    if (!lockEnabled || !originalImage) return;

    const newHeight = parseInt(heightInput.value, 10);
    if (!newHeight || newHeight < 1) return;

    const newWidth = Math.round(clamp(newHeight) * aspectRatio);
    widthInput.value = Math.max(1, newWidth);

    checkUpscaling();
});

// Warn the user if they are making the image bigger
function checkUpscaling() {
    if (!originalImage) return;

    const w = parseInt(widthInput.value, 10);
    const h = parseInt(heightInput.value, 10);

    if (w > originalImage.width || h > originalImage.height) {
        showMessage('⚠️ You are enlarging this image. Upscaling cannot add real detail — the result may look soft or blurry.');
    } else {
        clearMessage();
    }
}

// =========================================
// 7. RESIZE LOGIC
// =========================================

resizeBtn.addEventListener('click', function() {
    if (!originalImage) {
        alert('Please select an image first.');
        return;
    }

    // Read what the user typed
    const newWidth = parseInt(widthInput.value, 10);
    const newHeight = parseInt(heightInput.value, 10);

    // Validate the inputs
    if (!newWidth || !newHeight || newWidth < 1 || newHeight < 1) {
        showMessage('Please enter a width and height greater than 0.');
        return;
    }

    if (newWidth > MAX_SIZE || newHeight > MAX_SIZE) {
        showMessage('That size is too large. Please keep both values at ' + MAX_SIZE + ' px or below.');
        return;
    }

    clearMessage();

    resizeBtn.textContent = 'Resizing...';
    resizeBtn.disabled = true;

    // Create a canvas at the NEW size
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');

    // JPG has no transparency, so give it a white background first
    if (originalType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // This single line does the actual resizing.
    // The browser scales the original image to fit the new canvas.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(originalImage, 0, 0, newWidth, newHeight);

    // Keep the same format as the original file
    const outputType = originalType;
    const extension = outputType === 'image/jpeg' ? 'jpg' :
                      outputType === 'image/png' ? 'png' : 'webp';

    // Convert the canvas into a downloadable file
    canvas.toBlob(function(blob) {
        // Reset the button whether we succeeded or not
        resizeBtn.textContent = 'Resize Image';
        resizeBtn.disabled = false;

        if (!blob) {
            showMessage('Resizing failed. Try a smaller size or a different image.');
            return;
        }

        // Free the previous download link (if any)
        if (downloadURL) {
            URL.revokeObjectURL(downloadURL);
        }

        // Create the new download link
        downloadURL = URL.createObjectURL(blob);
        
        // =========================================
        // POPULATE THE NEW RESULT AREA
        // =========================================
        
        // 1. Original Image Stats
        resultOriginalImage.src = originalImage.src;
        resultOriginalDimensions.textContent = originalImage.width + ' × ' + originalImage.height + ' px';
        resultOriginalSize.textContent = formatBytes(originalFile.size);

        // 2. Resized Image Stats
        resultResizedImage.src = downloadURL;
        resultResizedDimensions.textContent = newWidth + ' × ' + newHeight + ' px';
        resultResizedSize.textContent = formatBytes(blob.size);

        // 3. Setup Download Button
        downloadBtn.href = downloadURL;
        downloadBtn.download = 'resized-' + newWidth + 'x' + newHeight + '.' + extension;
        downloadBtn.textContent = '⬇ Download Resized Image (' + formatBytes(blob.size) + ')';
        downloadBtn.style.display = 'inline-block';

        // 4. Show the Result Area and scroll to it
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

    }, outputType, 0.92);
});