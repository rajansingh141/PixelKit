// =========================================
// 1. GET ALL THE HTML ELEMENTS WE NEED
// =========================================

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const imageListSection = document.getElementById('image-list-section');
const imageList = document.getElementById('image-list');
const imageCount = document.getElementById('image-count');
const addMoreBtn = document.getElementById('add-more-btn');
const emptyMessage = document.getElementById('empty-message');
const settingsSection = document.getElementById('settings-section');
const pageSizeSelect = document.getElementById('page-size');
const orientationSelect = document.getElementById('orientation');
const imageFitSelect = document.getElementById('image-fit');
const statusMessage = document.getElementById('status-message');
const generateBtn = document.getElementById('generate-btn');

// Result section elements
const resultSection = document.getElementById('result-section');
const pdfPageCount = document.getElementById('pdf-page-count');
const pdfFileSize = document.getElementById('pdf-file-size');
const pdfPreviewIframe = document.getElementById('pdf-preview-iframe');
const downloadBtn = document.getElementById('download-btn');

// =========================================
// 2. VARIABLES TO REMEMBER THINGS
// =========================================

let imageFiles = [];   // Array of File objects in display order
let pdfBlobURL = null; // URL for the generated PDF (for cleanup)

// =========================================
// 3. HELPER FUNCTIONS
// =========================================

// Format file size in KB or MB
function formatBytes(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Show a status message (info / warning / error)
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
    statusMessage.style.display = 'block';
}

// Hide the status message
function hideStatus() {
    statusMessage.style.display = 'none';
}

// Load a File as an HTMLImageElement + data URL (Promise-based)
function loadImageFromFile(file) {
    return new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                resolve({ img: img, dataUrl: event.target.result });
            };
            img.onerror = function() {
                reject(new Error('Could not decode image: ' + file.name));
            };
            img.src = event.target.result;
        };
        reader.onerror = function() {
            reject(new Error('Could not read file: ' + file.name));
        };
        reader.readAsDataURL(file);
    });
}

// Convert an image to a data URL in a chosen format (JPEG or PNG).
// Optionally crops the image to a target aspect ratio (for "Fill Page" mode).
function convertViaCanvas(img, targetFormat, cropAspectRatio) {
    return new Promise(function(resolve) {
        const canvas = document.createElement('canvas');

        let sourceX = 0;
        let sourceY = 0;
        let sourceW = img.width;
        let sourceH = img.height;

        // If a crop aspect ratio is given, crop the source to that ratio (centered)
        if (cropAspectRatio && cropAspectRatio > 0) {
            const imgRatio = img.width / img.height;
            if (imgRatio > cropAspectRatio) {
                // Image is wider than target — crop width
                sourceW = img.height * cropAspectRatio;
                sourceX = (img.width - sourceW) / 2;
            } else if (imgRatio < cropAspectRatio) {
                // Image is taller than target — crop height
                sourceH = img.width / cropAspectRatio;
                sourceY = (img.height - sourceH) / 2;
            }
            // else: already matches — no crop needed
        }

        canvas.width = sourceW;
        canvas.height = sourceH;
        const ctx = canvas.getContext('2d');

        // JPEG has no transparency — fill with white first
        if (targetFormat === 'JPEG') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw the (possibly cropped) image onto the canvas
        ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);

        const mimeType = targetFormat === 'JPEG' ? 'image/jpeg' : 'image/png';
        canvas.toBlob(function(blob) {
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve(e.target.result); // data URL in the target format
            };
            reader.readAsDataURL(blob);
        }, mimeType, 0.92);
    });
}

// =========================================
// 4. IMAGE LIST UI
// =========================================

function updateImageList() {
    imageList.innerHTML = '';
    imageCount.textContent = imageFiles.length;

    if (imageFiles.length === 0) {
        imageListSection.style.display = 'none';
        settingsSection.style.display = 'none';
        resultSection.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    imageListSection.style.display = 'block';
    settingsSection.style.display = 'block';
    emptyMessage.style.display = 'none';
    // Don't hide resultSection here — user may want to keep the last PDF

    imageFiles.forEach(function(file, index) {
        const card = document.createElement('div');
        card.className = 'image-card';

        const thumbnail = document.createElement('img');
        thumbnail.className = 'image-thumbnail';
        thumbnail.src = URL.createObjectURL(file);
        thumbnail.alt = file.name;

        const info = document.createElement('div');
        info.className = 'image-info';
        info.innerHTML =
            '<div class="image-name">' + file.name + '</div>' +
            '<div class="image-size">' + formatBytes(file.size) + '</div>';

        const controls = document.createElement('div');
        controls.className = 'image-controls';

        const moveUpBtn = document.createElement('button');
        moveUpBtn.textContent = '↑';
        moveUpBtn.title = 'Move up';
        moveUpBtn.disabled = index === 0;
        moveUpBtn.addEventListener('click', function() { moveImage(index, index - 1); });

        const moveDownBtn = document.createElement('button');
        moveDownBtn.textContent = '↓';
        moveDownBtn.title = 'Move down';
        moveDownBtn.disabled = index === imageFiles.length - 1;
        moveDownBtn.addEventListener('click', function() { moveImage(index, index + 1); });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.className = 'remove-btn';
        removeBtn.title = 'Remove image';
        removeBtn.addEventListener('click', function() { removeImage(index); });

        controls.appendChild(moveUpBtn);
        controls.appendChild(moveDownBtn);
        controls.appendChild(removeBtn);

        card.appendChild(thumbnail);
        card.appendChild(info);
        card.appendChild(controls);

        imageList.appendChild(card);
    });
}

function moveImage(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= imageFiles.length) return;
    const temp = imageFiles[fromIndex];
    imageFiles[fromIndex] = imageFiles[toIndex];
    imageFiles[toIndex] = temp;
    updateImageList();
}

function removeImage(index) {
    imageFiles.splice(index, 1);
    updateImageList();
}

// =========================================
// 5. FILE UPLOAD HANDLING
// =========================================

uploadArea.addEventListener('click', function() {
    fileInput.click();
});

addMoreBtn.addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let skippedCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith('image/')) {
            skippedCount++;
            continue;
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            skippedCount++;
            continue;
        }

        imageFiles.push(file);
    }

    // Reset so the same file(s) can be selected again
    fileInput.value = '';

    updateImageList();

    if (skippedCount > 0) {
        showStatus('⚠️ ' + skippedCount + ' file(s) skipped — not a supported image format (JPG, PNG, WebP).', 'warning');
    } else {
        hideStatus();
    }
});

// =========================================
// 6. PDF GENERATION (SEQUENTIAL + ROBUST)
// =========================================

generateBtn.addEventListener('click', async function() {
    if (imageFiles.length === 0) {
        showStatus('⚠️ Please add at least one image first.', 'warning');
        return;
    }

    // Enter loading state
    generateBtn.textContent = 'Generating PDF...';
    generateBtn.disabled = true;
    hideStatus();

    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            throw new Error('PDF library failed to load. Check your internet connection and refresh the page.');
        }

        const doc = new jsPDF({
            orientation: orientationSelect.value,
            unit: 'mm',
            format: pageSizeSelect.value
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageRatio = pageWidth / pageHeight;
        const imageFit = imageFitSelect.value;

        let processedCount = 0;
        let errorCount = 0;
        let errorNames = [];
        let isFirstPage = true;

        // Process images ONE AT A TIME so order is preserved
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];

            try {
                const { img, dataUrl } = await loadImageFromFile(file);

                // Decide output format for jsPDF
                // jsPDF supports JPEG and PNG. WebP must be converted.
                let dataForPdf = dataUrl;
                let pdfFormat = 'JPEG';

                if (file.type === 'image/png') {
                    pdfFormat = 'PNG';
                } else if (file.type === 'image/webp') {
                    // Convert WebP → PNG (preserves transparency)
                    dataForPdf = await convertViaCanvas(img, 'PNG', null);
                    pdfFormat = 'PNG';
                } else {
                    // JPEG
                    pdfFormat = 'JPEG';
                }

                // Calculate position and size based on fit mode
                let imgWidth, imgHeight, x, y;

                if (imageFit === 'fit') {
                    // Fit inside page, maintain aspect ratio, center
                    const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
                    imgWidth = img.width * ratio;
                    imgHeight = img.height * ratio;
                    x = (pageWidth - imgWidth) / 2;
                    y = (pageHeight - imgHeight) / 2;
                } else if (imageFit === 'fill') {
                    // Crop image to page aspect ratio, then stretch to full page
                    dataForPdf = await convertViaCanvas(img, pdfFormat, pageRatio);
                    imgWidth = pageWidth;
                    imgHeight = pageHeight;
                    x = 0;
                    y = 0;
                } else {
                    // Original size (96 DPI conversion)
                    const dpi = 96;
                    imgWidth = (img.width / dpi) * 25.4;
                    imgHeight = (img.height / dpi) * 25.4;

                    // If larger than page, scale down to fit (preserve aspect ratio)
                    if (imgWidth > pageWidth || imgHeight > pageHeight) {
                        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                        imgWidth = imgWidth * ratio;
                        imgHeight = imgHeight * ratio;
                    }

                    x = (pageWidth - imgWidth) / 2;
                    y = (pageHeight - imgHeight) / 2;
                }

                // Add a new page before every image except the first
                if (!isFirstPage) {
                    doc.addPage();
                }
                isFirstPage = false;

                doc.addImage(dataForPdf, pdfFormat, x, y, imgWidth, imgHeight);
                processedCount++;

            } catch (err) {
                console.error('Error processing image:', file.name, err);
                errorCount++;
                errorNames.push(file.name);
            }
        }

        // If nothing succeeded, fail cleanly
        if (processedCount === 0) {
            throw new Error('No images could be processed. Please try different files.');
        }

        // Build the PDF blob
        const pdfBlob = doc.output('blob');

        // Free previous PDF URL to avoid memory leaks
        if (pdfBlobURL) {
            URL.revokeObjectURL(pdfBlobURL);
        }
        pdfBlobURL = URL.createObjectURL(pdfBlob);

        // =========================================
        // UPDATE THE RESULT SECTION
        // =========================================

        // Update info display
        pdfPageCount.textContent = processedCount;
        pdfFileSize.textContent = formatBytes(pdfBlob.size);

        // Update iframe to show the PDF preview
        pdfPreviewIframe.src = pdfBlobURL;

        // Update download button
        downloadBtn.href = pdfBlobURL;
        downloadBtn.download = 'images-' + Date.now() + '.pdf';

        // Show warnings for any skipped images
        if (errorCount > 0) {
            showStatus(
                '⚠️ ' + errorCount + ' image(s) could not be added: ' +
                errorNames.slice(0, 3).join(', ') +
                (errorNames.length > 3 ? '...' : '') +
                '. The remaining ' + processedCount + ' image(s) were added successfully.',
                'warning'
            );
        } else {
            hideStatus();
        }

        // Show result section and scroll to it
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        console.error('PDF generation failed:', err);
        showStatus('❌ ' + (err.message || 'PDF generation failed. Please try again.'), 'error');
    } finally {
        // ALWAYS reset the button, even if something threw
        generateBtn.textContent = 'Generate PDF';
        generateBtn.disabled = false;
    }
});