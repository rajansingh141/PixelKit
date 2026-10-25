// =========================================
// 1. GET ALL THE HTML ELEMENTS WE NEED
// =========================================

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const editorArea = document.getElementById('editor-area');
const previewImage = document.getElementById('preview-image');
const originalFormatEl = document.getElementById('original-format');
const originalDimensionsEl = document.getElementById('original-dimensions');
const originalSizeEl = document.getElementById('original-size');
const formatSelect = document.getElementById('format-select');
const warningEl = document.getElementById('warning-message');
const infoEl = document.getElementById('info-message');
const convertBtn = document.getElementById('convert-btn');

// Result area elements
const resultArea = document.getElementById('result-area');
const resultOriginalImage = document.getElementById('result-original-image');
const resultOriginalFormat = document.getElementById('result-original-format');
const resultOriginalDimensions = document.getElementById('result-original-dimensions');
const resultOriginalSize = document.getElementById('result-original-size');
const resultConvertedImage = document.getElementById('result-converted-image');
const resultConvertedFormat = document.getElementById('result-converted-format');
const resultConvertedDimensions = document.getElementById('result-converted-dimensions');
const resultConvertedSize = document.getElementById('result-converted-size');
const resultStatus = document.getElementById('result-status');
const downloadBtn = document.getElementById('download-btn');

// =========================================
// 2. VARIABLES TO REMEMBER THINGS
// =========================================

let originalFile = null;
let originalImage = null;
let originalType = null;
let downloadURL = null;

// Helper: Get friendly format name
function getFormatName(mimeType) {
    if (mimeType === 'image/jpeg') return 'JPG';
    if (mimeType === 'image/png') return 'PNG';
    if (mimeType === 'image/webp') return 'WebP';
    return 'Unknown';
}

// Helper: Format file size
function formatBytes(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Helper: Get file extension from MIME type
function getExtension(mimeType) {
    if (mimeType === 'image/jpeg') return 'jpg';
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    return 'jpg';
}

// =========================================
// 3. FILE SELECTION
// =========================================

uploadArea.addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return; // User cancelled

    // Check supported formats
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Unsupported format. Please use JPG, PNG, or WebP.');
        return;
    }

    originalFile = file;
    originalType = file.type;

    // Free previous download URL if any
    if (downloadURL) {
        URL.revokeObjectURL(downloadURL);
        downloadURL = null;
    }

    // Reset the UI
    resultArea.style.display = 'none';
    downloadBtn.style.display = 'none';
    warningEl.style.display = 'none';
    infoEl.style.display = 'none';

    // Load and preview the image
    const reader = new FileReader();

    reader.onload = function(event) {
        const img = new Image();

        img.onload = function() {
            originalImage = img;

            // Show preview
            previewImage.src = event.target.result;
            originalFormatEl.textContent = getFormatName(file.type);
            originalDimensionsEl.textContent = img.width + ' × ' + img.height + ' px';
            originalSizeEl.textContent = formatBytes(file.size);

            // Show the editor
            editorArea.style.display = 'grid';

            // Update messages based on current format selection
            updateMessages();
        };

        img.onerror = function() {
            alert('This image could not be opened. Please try another file.');
        };

        img.src = event.target.result;
    };

    reader.readAsDataURL(file);
});

// =========================================
// 4. FORMAT SELECTION & MESSAGES
// =========================================

formatSelect.addEventListener('change', function() {
    updateMessages();
});

function updateMessages() {
    warningEl.style.display = 'none';
    infoEl.style.display = 'none';

    const selectedFormat = formatSelect.value;

    // Case 1: Same format selected
    if (selectedFormat === originalType) {
        infoEl.textContent = 'ℹ️ This is the same format as the original. The image will be re-encoded, which may slightly change quality.';
        infoEl.style.display = 'block';
    }
    // Case 2: PNG → JPG (transparency will be lost)
    else if (originalType === 'image/png' && selectedFormat === 'image/jpeg') {
        warningEl.textContent = '⚠️ JPG does not support transparency. Any transparent areas in your PNG will become white.';
        warningEl.style.display = 'block';
    }
    // Case 3: JPG → PNG (no transparency, but that's fine)
    else if (originalType === 'image/jpeg' && selectedFormat === 'image/png') {
        infoEl.textContent = 'ℹ️ JPG does not have transparency, so the PNG will also be fully opaque.';
        infoEl.style.display = 'block';
    }
    // Other conversions: no special message needed
}

// =========================================
// 5. CONVERSION LOGIC
// =========================================

convertBtn.addEventListener('click', function() {
    if (!originalImage) {
        alert('Please select an image first.');
        return;
    }

    const outputType = formatSelect.value;

    // Show loading state
    convertBtn.textContent = 'Converting...';
    convertBtn.disabled = true;

    // Hide previous results
    resultArea.style.display = 'none';
    downloadBtn.style.display = 'none';

    // Create a canvas at the same size as the original
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    const ctx = canvas.getContext('2d');

    // If output is JPG, fill with white background first
    // (because JPG doesn't support transparency)
    if (outputType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw the image onto the canvas
    ctx.drawImage(originalImage, 0, 0);

    // Convert canvas to blob in the selected format
    // Quality parameter only affects JPG and WebP (PNG ignores it)
    canvas.toBlob(function(blob) {
        // Reset button
        convertBtn.textContent = 'Convert Image';
        convertBtn.disabled = false;

        if (!blob) {
            alert('Conversion failed. Please try a different image or format.');
            return;
        }

        // Free previous download URL
        if (downloadURL) {
            URL.revokeObjectURL(downloadURL);
        }

        // Create new download URL
        downloadURL = URL.createObjectURL(blob);

        // =========================================
        // POPULATE THE RESULT AREA
        // =========================================

        // 1. Original Image Stats
        resultOriginalImage.src = previewImage.src;
        resultOriginalFormat.textContent = getFormatName(originalType);
        resultOriginalDimensions.textContent = originalImage.width + ' × ' + originalImage.height + ' px';
        resultOriginalSize.textContent = formatBytes(originalFile.size);

        // 2. Converted Image Stats
        resultConvertedImage.src = downloadURL;
        resultConvertedFormat.textContent = getFormatName(outputType);
        resultConvertedDimensions.textContent = originalImage.width + ' × ' + originalImage.height + ' px';
        resultConvertedSize.textContent = formatBytes(blob.size);

        // 3. Status message
        if (outputType === originalType) {
            resultStatus.textContent = '✓ Image re-encoded in the same format.';
        } else {
            resultStatus.textContent = '✓ Successfully converted from ' + getFormatName(originalType) + ' to ' + getFormatName(outputType) + '.';
        }

        // 4. Setup Download Button
        const extension = getExtension(outputType);
        downloadBtn.href = downloadURL;
        downloadBtn.download = 'converted-image.' + extension;
        downloadBtn.textContent = '⬇ Download as ' + getFormatName(outputType).toUpperCase() + ' (' + formatBytes(blob.size) + ')';
        downloadBtn.style.display = 'inline-block';

        // 5. Show Result Area and scroll to it
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

    }, outputType, 0.92); // 0.92 quality for JPG/WebP
});