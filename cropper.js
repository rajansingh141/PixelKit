// =========================================
// 1. GET ALL THE HTML ELEMENTS WE NEED
// =========================================

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const editorArea = document.getElementById('editor-area');
const cropperImage = document.getElementById('cropper-image');
const originalDimensionsEl = document.getElementById('original-dimensions');
const originalFileSizeEl = document.getElementById('original-file-size');

const ratioButtons = document.querySelectorAll('.ratio-btn');
const rotateLeftBtn = document.getElementById('rotate-left-btn');
const rotateRightBtn = document.getElementById('rotate-right-btn');
const flipHBtn = document.getElementById('flip-h-btn');
const flipVBtn = document.getElementById('flip-v-btn');
const resetBtn = document.getElementById('reset-btn');
const cropBtn = document.getElementById('crop-btn');

const resultArea = document.getElementById('result-area');
const resultOriginalImage = document.getElementById('result-original-image');
const resultOriginalDimensions = document.getElementById('result-original-dimensions');
const resultOriginalSize = document.getElementById('result-original-size');
const resultCroppedImage = document.getElementById('result-cropped-image');
const resultCroppedDimensions = document.getElementById('result-cropped-dimensions');
const resultCroppedSize = document.getElementById('result-cropped-size');
const downloadBtn = document.getElementById('download-btn');

// =========================================
// 2. VARIABLES TO REMEMBER THINGS
// =========================================

let cropper = null;          // The Cropper.js instance
let originalFile = null;     // The file the user picked
let originalType = 'image/jpeg';
let originalWidth = 0;
let originalHeight = 0;
let imageObjectURL = null;   // URL of the uploaded image
let downloadURL = null;      // URL of the cropped result
let currentRatio = NaN;      // NaN = free (no fixed ratio)
let scaleX = 1;              // Horizontal flip state
let scaleY = 1;              // Vertical flip state

// =========================================
// 3. HELPER FUNCTIONS
// =========================================

function formatBytes(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Hide the result and free its memory
function hideResult() {
    resultArea.style.display = 'none';
    downloadBtn.style.display = 'none';

    if (downloadURL) {
        URL.revokeObjectURL(downloadURL);
        downloadURL = null;
    }
}

// =========================================
// 4. FILE UPLOAD & CROPPER SETUP
// =========================================

uploadArea.addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Unsupported format. Please use a JPG, PNG, or WebP image.');
        return;
    }

    // Check that the library actually loaded from the CDN
    if (typeof window.Cropper === 'undefined') {
        alert('The cropper library did not load. Check your internet connection and refresh the page.');
        return;
    }

    originalFile = file;
    originalType = file.type;

    // Clear any previous result
    hideResult();
    editorArea.style.display = 'none';

    // Destroy the previous cropper before changing the image
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    // Free the previous image URL
    if (imageObjectURL) {
        URL.revokeObjectURL(imageObjectURL);
    }
    imageObjectURL = URL.createObjectURL(file);

    // Reset transform state
    scaleX = 1;
    scaleY = 1;

    // Read the image first so we know its real dimensions
    const loader = new Image();

    loader.onload = function() {
        originalWidth = loader.naturalWidth;
        originalHeight = loader.naturalHeight;

        originalDimensionsEl.textContent = originalWidth + ' × ' + originalHeight + ' px';
        originalFileSizeEl.textContent = 'File size: ' + formatBytes(file.size);

        // Give the img a fresh source and show the editor
        cropperImage.src = imageObjectURL;
        editorArea.style.display = 'grid';

        // Create the Cropper.js instance
        cropper = new Cropper(cropperImage, {
            aspectRatio: currentRatio,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            responsive: true,
            restore: true,
            guides: true,
            center: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            // Hide the old result whenever the selection changes
            cropend: function() {
                hideResult();
            }
        });
    };

    loader.onerror = function() {
        alert('This image could not be opened. Please try another file.');
    };

    loader.src = imageObjectURL;

    // Allow the same file to be selected again later
    fileInput.value = '';
});

// =========================================
// 5. ASPECT RATIO BUTTONS
// =========================================

ratioButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
        // Update the highlighted button
        ratioButtons.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');

        // "Free" uses NaN, which tells Cropper.js: no fixed ratio
        currentRatio = parseFloat(btn.dataset.ratio);

        if (cropper) {
            cropper.setAspectRatio(currentRatio);
            hideResult();
        }
    });
});

// =========================================
// 6. ROTATE & FLIP BUTTONS
// =========================================

rotateLeftBtn.addEventListener('click', function() {
    if (cropper) {
        cropper.rotate(-90);
        hideResult();
    }
});

rotateRightBtn.addEventListener('click', function() {
    if (cropper) {
        cropper.rotate(90);
        hideResult();
    }
});

flipHBtn.addEventListener('click', function() {
    if (cropper) {
        scaleX = -scaleX;
        cropper.scaleX(scaleX);
        hideResult();
    }
});

flipVBtn.addEventListener('click', function() {
    if (cropper) {
        scaleY = -scaleY;
        cropper.scaleY(scaleY);
        hideResult();
    }
});

// =========================================
// 7. RESET BUTTON
// =========================================

resetBtn.addEventListener('click', function() {
    if (!cropper) return;

    scaleX = 1;
    scaleY = 1;
    cropper.reset();          // Back to the original position and zoom
    cropper.scaleX(1);
    cropper.scaleY(1);
    cropper.setAspectRatio(currentRatio); // Keep the chosen ratio
    hideResult();
});

// =========================================
// 8. CROP & DOWNLOAD
// =========================================

cropBtn.addEventListener('click', function() {
    if (!cropper || !originalFile) {
        alert('Please select an image first.');
        return;
    }

    cropBtn.textContent = 'Cropping...';
    cropBtn.disabled = true;
    hideResult();

    try {
        // Get the selected area as a canvas at the image's natural resolution
        const canvas = cropper.getCroppedCanvas({
            maxWidth: 4096,
            maxHeight: 4096,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
            throw new Error('The crop area is empty. Please drag the crop box over the image.');
        }

        // Determine output format
        let outputType = originalType;

        // =========================================
        // FIX: For JPG, create a NEW canvas with white background
        // For PNG and WebP, use the original canvas (preserves transparency)
        // =========================================
        let finalCanvas = canvas;

        if (outputType === 'image/jpeg') {
            // JPG cannot store transparency, so create a new canvas
            finalCanvas = document.createElement('canvas');
            finalCanvas.width = canvas.width;
            finalCanvas.height = canvas.height;
            const finalCtx = finalCanvas.getContext('2d');
            
            // Fill with white FIRST
            finalCtx.fillStyle = '#FFFFFF';
            finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            
            // Then draw the cropped image ON TOP
            finalCtx.drawImage(canvas, 0, 0);
        }
        // For PNG and WebP, finalCanvas remains the original canvas
        // (transparency is preserved)

        finalCanvas.toBlob(function(blob) {
            cropBtn.textContent = 'Crop Image';
            cropBtn.disabled = false;

            if (!blob) {
                alert('Cropping failed. Please try a smaller selection or a different image.');
                return;
            }

            // Use the ACTUAL output type (browser may fall back to PNG)
            const actualType = blob.type || outputType;
            let extension = 'png';
            if (actualType === 'image/jpeg') extension = 'jpg';
            else if (actualType === 'image/webp') extension = 'webp';

            // Original image in the result section
            resultOriginalImage.src = imageObjectURL;
            resultOriginalDimensions.textContent = originalWidth + ' × ' + originalHeight + ' px';
            resultOriginalSize.textContent = formatBytes(originalFile.size);

            // Cropped image in the result section
            downloadURL = URL.createObjectURL(blob);
            resultCroppedImage.src = downloadURL;
            resultCroppedDimensions.textContent = finalCanvas.width + ' × ' + finalCanvas.height + ' px';
            resultCroppedSize.textContent = formatBytes(blob.size);

            // Download button
            downloadBtn.href = downloadURL;
            downloadBtn.download = 'cropped-' + finalCanvas.width + 'x' + finalCanvas.height + '.' + extension;
            downloadBtn.style.display = 'inline-block';

            // Show and scroll to the result
            resultArea.style.display = 'block';
            resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

        }, outputType, 0.92);

    } catch (error) {
        console.error(error);
        cropBtn.textContent = 'Crop Image';
        cropBtn.disabled = false;
        alert('Cropping failed: ' + error.message);
    }
});