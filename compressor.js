// =========================================
// 1. GET ALL THE HTML ELEMENTS WE NEED
// =========================================

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const editorArea = document.getElementById('editor-area');
const previewImage = document.getElementById('preview-image');
const originalSizeEl = document.getElementById('original-size');
const originalDimensionsEl = document.getElementById('original-dimensions');
const formatNoteEl = document.getElementById('format-note');
const qualitySlider = document.getElementById('quality-slider');
const qualityValueEl = document.getElementById('quality-value');
const formatHintEl = document.getElementById('format-hint');
const compressBtn = document.getElementById('compress-btn');

// NEW: Result area elements
const resultArea = document.getElementById('result-area');
const resultOriginalImage = document.getElementById('result-original-image');
const resultOriginalDimensions = document.getElementById('result-original-dimensions');
const resultOriginalSize = document.getElementById('result-original-size');
const resultCompressedImage = document.getElementById('result-compressed-image');
const resultCompressedDimensions = document.getElementById('result-compressed-dimensions');
const resultCompressedSize = document.getElementById('result-compressed-size');
const resultReduction = document.getElementById('result-reduction');
const resultWarning = document.getElementById('result-warning');
const downloadBtn = document.getElementById('download-btn');

// Store the original file and its type
let originalFile = null;
let originalFileType = null;
let downloadURL = null;

// =========================================
// 2. HELPER: FORMAT FILE SIZE
// =========================================

function formatBytes(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// =========================================
// 3. FILE SELECTION
// =========================================

// When user clicks the upload area, trigger the file input
uploadArea.addEventListener('click', function() {
    fileInput.click();
});

// When user selects a file
fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    
    if (!file) return; // User cancelled
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, or WebP).');
        return;
    }
    
    // Check if it's a supported format
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Unsupported format. Please use JPG, PNG, or WebP.');
        return;
    }
    
    // Store the file
    originalFile = file;
    originalFileType = file.type;
    
    // If there was a previous download, free that memory
    if (downloadURL) {
        URL.revokeObjectURL(downloadURL);
        downloadURL = null;
    }
    
    // Hide previous results
    resultArea.style.display = 'none';
    downloadBtn.style.display = 'none';
    resultWarning.style.display = 'none';
    
    // Show the editor area
    editorArea.style.display = 'grid';
    
    // Load and preview the image
    loadImagePreview(file);
});

// =========================================
// 4. IMAGE PREVIEW
// =========================================

function loadImagePreview(file) {
    const reader = new FileReader();
    
    reader.onload = function(event) {
        // Show the image preview
        previewImage.src = event.target.result;
        
        // Show original file size
        originalSizeEl.textContent = formatBytes(file.size);
        
        // Get image dimensions
        const img = new Image();
        img.onload = function() {
            originalDimensionsEl.textContent = 'Dimensions: ' + img.width + ' × ' + img.height + ' pixels';
        };
        img.src = event.target.result;
        
        // Show format-specific notes
        if (file.type === 'image/png') {
            formatNoteEl.textContent = '⚠️ PNG is lossless. We\'ll convert to JPG for best compression.';
            formatHintEl.textContent = 'PNG will be converted to JPG for compression.';
        } else if (file.type === 'image/webp') {
            formatNoteEl.textContent = '✓ WebP compression works great!';
            formatHintEl.textContent = 'Works best with JPG and WebP images.';
        } else {
            formatNoteEl.textContent = '';
            formatHintEl.textContent = 'Works best with JPG and WebP images.';
        }
    };
    
    reader.readAsDataURL(file);
}

// =========================================
// 5. QUALITY SLIDER
// =========================================

// Update the displayed quality value when slider moves
qualitySlider.addEventListener('input', function() {
    qualityValueEl.textContent = qualitySlider.value;
});

// =========================================
// 6. COMPRESSION LOGIC
// =========================================

compressBtn.addEventListener('click', function() {
    if (!originalFile) {
        alert('Please select an image first.');
        return;
    }
    
    // Show a loading state
    compressBtn.textContent = 'Compressing...';
    compressBtn.disabled = true;
    
    // Hide previous results
    resultArea.style.display = 'none';
    downloadBtn.style.display = 'none';
    resultWarning.style.display = 'none';
    
    // Create a canvas to draw the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Load the image onto the canvas
    const img = new Image();
    img.onload = function() {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Determine output format and quality
        let outputType = originalFileType;
        let quality = qualitySlider.value / 100; // Convert 0-100 to 0-1
        
        // If it's PNG, convert to JPG for actual compression
        if (originalFileType === 'image/png') {
            outputType = 'image/jpeg';
            // Fill with white background (JPG doesn't support transparency)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Draw the image
        ctx.drawImage(img, 0, 0);
        
        // Compress the image
        canvas.toBlob(function(blob) {
            if (!blob) {
                alert('Compression failed. Please try again.');
                compressBtn.textContent = 'Compress Image';
                compressBtn.disabled = false;
                return;
            }
            
            // =========================================
            // POPULATE THE NEW RESULT AREA
            // =========================================
            
            // 1. Original Image Stats
            resultOriginalImage.src = previewImage.src;
            resultOriginalDimensions.textContent = img.width + ' × ' + img.height + ' px';
            resultOriginalSize.textContent = formatBytes(originalFile.size);
            
            // 2. Compressed Image Stats
            resultCompressedImage.src = URL.createObjectURL(blob);
            resultCompressedDimensions.textContent = img.width + ' × ' + img.height + ' px';
            resultCompressedSize.textContent = formatBytes(blob.size);
            
            // 3. Calculate reduction percentage
            const reduction = ((originalFile.size - blob.size) / originalFile.size * 100).toFixed(1);
            
            // Handle the edge case where compressed is larger
            if (blob.size > originalFile.size) {
                resultReduction.textContent = reduction + '%';
                resultReduction.style.color = '#dc2626'; // Red color
                resultWarning.textContent = '⚠️ The compressed file is larger than the original. Try a lower quality setting.';
                resultWarning.style.display = 'block';
            } else {
                resultReduction.textContent = reduction + '%';
                resultReduction.style.color = '#10b981'; // Green color
                resultWarning.style.display = 'none';
            }
            
            // 4. Setup Download Button
            if (downloadURL) {
                URL.revokeObjectURL(downloadURL);
            }
            downloadURL = URL.createObjectURL(blob);
            downloadBtn.href = downloadURL;
            
            // Set appropriate file extension
            const extension = outputType === 'image/jpeg' ? 'jpg' : 'webp';
            downloadBtn.download = 'compressed-image.' + extension;
            downloadBtn.textContent = '⬇ Download Compressed Image (' + formatBytes(blob.size) + ')';
            downloadBtn.style.display = 'inline-block';
            
            // 5. Show the Result Area and scroll to it
            resultArea.style.display = 'block';
            resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Reset button
            compressBtn.textContent = 'Compress Image';
            compressBtn.disabled = false;
            
        }, outputType, quality);
    };
    
    img.onerror = function() {
        alert('Failed to load image. Please try a different file.');
        compressBtn.textContent = 'Compress Image';
        compressBtn.disabled = false;
    };
    
    // Load the image from the file
    const reader = new FileReader();
    reader.onload = function(event) {
        img.src = event.target.result;
    };
    reader.readAsDataURL(originalFile);
});