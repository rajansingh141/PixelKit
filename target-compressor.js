// =========================================
// 1. GOVERNMENT EXAM REQUIREMENTS DATA
// =========================================
// IMPORTANT: Requirements change by recruitment year and specific notification.
// Do not treat these as verified. Always check the latest official notification.

const examRequirements = [
    {
        name: "SSC CGL / CHSL",
        officialWebsite: "https://ssc.nic.in",
        note: "Photo and signature requirements vary by notification year. Check the latest official notice for exact size limits, dimensions, and format."
    },
    {
        name: "UPSC Civil Services",
        officialWebsite: "https://upsc.gov.in",
        note: "Photo and signature requirements vary by notification year. Check the latest official notice for exact size limits, dimensions, and format."
    },
    {
        name: "IBPS PO / Clerk",
        officialWebsite: "https://ibps.in",
        note: "Photo and signature requirements vary by notification year. Check the latest official notice for exact size limits, dimensions, and format."
    },
    {
        name: "SBI PO / Clerk",
        officialWebsite: "https://sbi.co.in/web/careers",
        note: "Photo and signature requirements vary by notification year. Check the latest official notice for exact size limits, dimensions, and format."
    },
    {
        name: "RRB NTPC / Group D",
        officialWebsite: "https://rrbcdg.gov.in",
        note: "Photo and signature requirements vary by notification year. Check the latest official notice for exact size limits, dimensions, and format."
    },
    {
        name: "UPPSC / UP Police",
        officialWebsite: "https://uppsc.up.nic.in",
        note: "Photo and signature requirements vary by notification year. Check the latest official notice for exact size limits, dimensions, and format."
    }
];

// =========================================
// 2. POPULATE EXAM REQUIREMENTS ON PAGE LOAD
// =========================================

function populateExamRequirements() {
    const examGrid = document.getElementById('exam-grid');
    
    examRequirements.forEach(function(exam) {
        const card = document.createElement('div');
        card.className = 'exam-card';
        
        let html = '<h3>' + exam.name + '</h3>';
        
        // Prominent unverified notice
        html += '<div class="exam-detail" style="color: #92400e; font-weight: 600; margin-bottom: 10px;">⚠️ Not verified</div>';
        html += '<div class="exam-detail" style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 12px;">' + exam.note + '</div>';
        
        // Official website link
        html += '<a href="' + exam.officialWebsite + '" target="_blank" class="exam-link">Visit official website →</a>';
        
        card.innerHTML = html;
        examGrid.appendChild(card);
    });
}

// Call this when the page loads
populateExamRequirements();

// =========================================
// 3. GET ALL THE HTML ELEMENTS WE NEED
// =========================================

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const editorArea = document.getElementById('editor-area');
const previewImage = document.getElementById('preview-image');
const originalSizeEl = document.getElementById('original-size');
const originalDimensionsEl = document.getElementById('original-dimensions');
const formatNoteEl = document.getElementById('format-note');
const targetSizeInput = document.getElementById('target-size-input');
const statusMessage = document.getElementById('status-message');
const compressBtn = document.getElementById('compress-btn');

// Result area elements
const resultArea = document.getElementById('result-area');
const resultOriginalImage = document.getElementById('result-original-image');
const resultOriginalDimensions = document.getElementById('result-original-dimensions');
const resultOriginalSize = document.getElementById('result-original-size');
const resultCompressedImage = document.getElementById('result-compressed-image');
const resultCompressedDimensions = document.getElementById('result-compressed-dimensions');
const resultCompressedSize = document.getElementById('result-compressed-size');
const resultReduction = document.getElementById('result-reduction');
const resultStatus = document.getElementById('result-status');
const downloadBtn = document.getElementById('download-btn');

// =========================================
// 4. VARIABLES TO REMEMBER THINGS
// =========================================

let originalFile = null;
let originalImage = null;
let originalType = null;
let downloadURL = null;

// =========================================
// 5. HELPER FUNCTIONS
// =========================================

function formatBytes(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
    statusMessage.style.display = 'block';
}

function hideStatus() {
    statusMessage.style.display = 'none';
}

function hideResult() {
    resultArea.style.display = 'none';
    downloadBtn.style.display = 'none';
    if (downloadURL) {
        URL.revokeObjectURL(downloadURL);
        downloadURL = null;
    }
}

// Get file extension from MIME type
function getExtensionFromMimeType(mimeType) {
    if (mimeType === 'image/jpeg') return 'jpg';
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    return 'jpg'; // fallback
}

// =========================================
// 6. FILE SELECTION
// =========================================

uploadArea.addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Unsupported format. Please use JPG, PNG, or WebP.');
        return;
    }

    originalFile = file;
    originalType = file.type;

    hideResult();
    hideStatus();
    editorArea.style.display = 'grid';

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            originalImage = img;
            previewImage.src = event.target.result;
            originalSizeEl.textContent = formatBytes(file.size);
            originalDimensionsEl.textContent = 'Dimensions: ' + img.width + ' × ' + img.height + ' pixels';

            // Show format-specific notes
            if (file.type === 'image/png') {
                formatNoteEl.textContent = '⚠️ PNG is lossless. For significant compression, we will convert to JPG (transparency will become white).';
            } else if (file.type === 'image/webp') {
                formatNoteEl.textContent = '✓ WebP compression works well.';
            } else {
                formatNoteEl.textContent = '';
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// =========================================
// 7. ITERATIVE COMPRESSION ALGORITHM
// =========================================

compressBtn.addEventListener('click', async function() {
    if (!originalFile || !originalImage) {
        alert('Please select an image first.');
        return;
    }

    const targetKB = parseInt(targetSizeInput.value, 10);
    if (!targetKB || targetKB < 1) {
        showStatus('Please enter a valid target size in KB.', 'error');
        return;
    }

    const targetBytes = targetKB * 1024;

    compressBtn.textContent = 'Compressing...';
    compressBtn.disabled = true;
    hideResult();
    hideStatus();

    try {
        // Determine output format
        let outputType = originalType;
        
        // For PNG, convert to JPG for better compression
        if (originalType === 'image/png') {
            outputType = 'image/jpeg';
        }

        // Start with high quality and iteratively reduce
        let quality = 0.90;
        let currentWidth = originalImage.width;
        let currentHeight = originalImage.height;
        let finalBlob = null;
        let finalWidth = currentWidth;
        let finalHeight = currentHeight;
        let iterations = 0;
        const maxIterations = 50; // Safety limit

        while (iterations < maxIterations) {
            iterations++;

            // Create canvas at current dimensions
            const canvas = document.createElement('canvas');
            canvas.width = currentWidth;
            canvas.height = currentHeight;
            const ctx = canvas.getContext('2d');

            // For JPG, fill with white background (no transparency)
            if (outputType === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Draw image
            ctx.drawImage(originalImage, 0, 0, currentWidth, currentHeight);

            // Convert to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, outputType, quality);
            });

            if (!blob) {
                throw new Error('Compression failed at quality ' + quality);
            }

            // Track this as the best result so far
            finalBlob = blob;
            finalWidth = currentWidth;
            finalHeight = currentHeight;

            // Check if we hit the target
            if (blob.size <= targetBytes) {
                break; // Success!
            }

            // If still too large, reduce quality
            if (quality > 0.10) {
                quality -= 0.05; // Reduce by 5%
                if (quality < 0.10) quality = 0.10;
            } else {
                // Quality is already at minimum, start reducing dimensions
                currentWidth = Math.floor(currentWidth * 0.90); // Reduce by 10%
                currentHeight = Math.floor(currentHeight * 0.90);

                // Safety: don't go below 50 pixels
                if (currentWidth < 50 || currentHeight < 50) {
                    break; // Use the last valid result
                }
            }
        }

        if (!finalBlob) {
            throw new Error('Could not generate compressed image.');
        }

        // =========================================
        // DISPLAY RESULTS
        // =========================================

        // Original image stats
        resultOriginalImage.src = previewImage.src;
        resultOriginalDimensions.textContent = originalImage.width + ' × ' + originalImage.height + ' px';
        resultOriginalSize.textContent = formatBytes(originalFile.size);

        // Compressed image stats (use ACTUAL dimensions from final canvas)
        downloadURL = URL.createObjectURL(finalBlob);
        resultCompressedImage.src = downloadURL;
        resultCompressedDimensions.textContent = finalWidth + ' × ' + finalHeight + ' px';
        resultCompressedSize.textContent = formatBytes(finalBlob.size);

        // Calculate reduction percentage
        const reduction = ((originalFile.size - finalBlob.size) / originalFile.size * 100).toFixed(1);
        resultReduction.textContent = reduction + '%';

        // Determine status - ONLY show success if target was actually achieved
        if (finalBlob.size <= targetBytes) {
            resultStatus.textContent = '✓ Target achieved! Compressed to ' + formatBytes(finalBlob.size) + ' (target: ' + targetKB + ' KB)';
            resultStatus.className = 'result-status achieved';
        } else {
            resultStatus.textContent = '⚠️ Target not achieved. Best possible: ' + formatBytes(finalBlob.size) + ' (target was ' + targetKB + ' KB). Further compression would severely degrade quality.';
            resultStatus.className = 'result-status not-achieved';
        }

        // Setup download button - derive extension from ACTUAL blob MIME type
        const actualMimeType = finalBlob.type || outputType;
        const extension = getExtensionFromMimeType(actualMimeType);
        downloadBtn.href = downloadURL;
        downloadBtn.download = 'compressed-' + targetKB + 'kb.' + extension;
        downloadBtn.textContent = '⬇ Download Compressed Image (' + formatBytes(finalBlob.size) + ')';
        downloadBtn.style.display = 'inline-block';

        // Show result and scroll to it
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Show info message if we had to reduce dimensions
        if (finalWidth < originalImage.width) {
            showStatus('ℹ️ Image dimensions were reduced to ' + finalWidth + '×' + finalHeight + ' px to reach the target size.', 'info');
        } else {
            hideStatus();
        }

    } catch (error) {
        console.error(error);
        showStatus('❌ Compression failed: ' + error.message, 'error');
    } finally {
        compressBtn.textContent = 'Compress to Target Size';
        compressBtn.disabled = false;
    }
});