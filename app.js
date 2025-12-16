class EmbroideryStylizer {
    constructor() {
        this.canvas = document.getElementById('resultCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.imageInput = document.getElementById('imageInput');
        this.imagePreview = document.getElementById('imagePreview');
        this.imageName = document.getElementById('imageName');
        this.imageSize = document.getElementById('imageSize');
        this.imagePreviewContainer = document.getElementById('imagePreviewContainer');
        this.textureSelect = document.getElementById('textureSelect');
        this.textureInput = document.getElementById('textureInput');
        this.pixelSizeSlider = document.getElementById('pixelSize');
        this.pixelSizeValue = document.getElementById('pixelSizeValue');
        this.blendModeSelect = document.getElementById('blendModeSelect');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        this.sourceImage = null;
        this.textureImage = null;
        this.pixelSize = 15;
        this.blendMode = 'multiply';
        this.textures = {}; // Texture storage: { name: { path, image } }
        this.currentTextureName = null;
        this.currentImageFileName = 'example.png';
        this.hasAlphaChannel = false; // Flag indicating alpha channel presence in the image
        this.debounceTimer = null;
        
        this.init();
    }
    
    async init() {
        // Initialize texture list
        this.initializeTextures();
        
        // Load default image
        await this.loadDefaultImage();
        
        // Set up event handlers
        this.imagePreviewContainer.addEventListener('click', () => this.imageInput.click());
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.textureSelect.addEventListener('change', (e) => this.handleTextureChange(e));
        this.textureInput.addEventListener('change', (e) => this.handleTextureUpload(e));
        this.pixelSizeSlider.addEventListener('input', (e) => this.handlePixelSizeChange(e));
        this.blendModeSelect.addEventListener('change', (e) => this.handleBlendModeChange(e));
        this.downloadBtn.addEventListener('click', () => this.downloadResult());
        
        // Load first texture and process image
        if (this.textureSelect.options.length > 0) {
            await this.loadTexture(this.textureSelect.options[0].value);
        }
        this.processImage();
    }
    
    formatTextureName(fileName) {
        // Remove file extension (dot and everything after it)
        const nameWithoutExtension = fileName.replace(/\.[^.]*$/, '');
        // Convert to uppercase
        return nameWithoutExtension.toUpperCase();
    }
    
    initializeTextures() {
        // List of available textures in the textures folder
        const textureList = ['texture.png', 'ovals.png', 'puzzle.png', 'cross.png', 'lego.png', 'square.png'];
        
        textureList.forEach(textureName => {
            this.addTextureToList(textureName);
        });
    }
    
    addTextureToList(textureName, isUploaded = false) {
        const option = document.createElement('option');
        option.value = textureName;
        option.textContent = this.formatTextureName(textureName);
        this.textureSelect.appendChild(option);
        
        if (!isUploaded) {
            this.textures[textureName] = {
                path: `imgs/textures/${textureName}`,
                image: null
            };
        }
    }
    
    async loadTexture(textureName) {
        // Check if texture is already loaded
        if (this.textures[textureName] && this.textures[textureName].image) {
            this.textureImage = this.textures[textureName].image;
this.currentTextureName = textureName;
                // Set selected texture in select element
                this.textureSelect.value = textureName;
                if (this.sourceImage) {
                    this.processImage();
                }
                return Promise.resolve();
        }
        
        const texturePath = this.textures[textureName]?.path || `imgs/textures/${textureName}`;
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (this.textures[textureName]) {
                    this.textures[textureName].image = img;
                } else {
                    this.textures[textureName] = { path: texturePath, image: img };
                }
                this.textureImage = img;
                this.currentTextureName = textureName;
                // Set selected texture in select element
                this.textureSelect.value = textureName;
                if (this.sourceImage) {
                    this.processImage();
                }
                resolve();
            };
            img.onerror = reject;
            img.src = texturePath;
        });
    }
    
    handleTextureChange(event) {
        const selectedTexture = event.target.value;
        if (selectedTexture) {
            this.loadTexture(selectedTexture);
        }
    }
    
    handleTextureUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const textureName = `uploaded_${Date.now()}_${file.name}`;
                const img = new Image();
                img.onload = () => {
                    this.textures[textureName] = {
                        path: e.target.result,
                        image: img
                    };
                    
                    // Add to select element
                    const option = document.createElement('option');
                    option.value = textureName;
                    option.textContent = this.formatTextureName(file.name);
                    this.textureSelect.appendChild(option);
                    this.textureSelect.value = textureName;
                    
                    // Apply texture
                    this.textureImage = img;
                    this.currentTextureName = textureName;
                    if (this.sourceImage) {
                        this.processImage();
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    
    checkAlphaChannel() {
        // Check for alpha channel presence in the image
        if (!this.sourceImage) {
            this.hasAlphaChannel = false;
            return;
        }
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.sourceImage.width;
        tempCanvas.height = this.sourceImage.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.sourceImage, 0, 0);
        
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        // Check if at least one pixel has alpha value < 255
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) {
                this.hasAlphaChannel = true;
                return;
            }
        }
        
        this.hasAlphaChannel = false;
    }
    
    async loadDefaultImage() {
        return new Promise((resolve, reject) => {
            // Try to get the default file size
            fetch('imgs/example.png')
                .then(response => {
                    const contentLength = response.headers.get('content-length');
                    const fileSize = contentLength ? parseInt(contentLength) : null;
                    this.sourceImage = new Image();
                    this.sourceImage.crossOrigin = 'anonymous';
                    this.sourceImage.onload = () => {
                        this.updateImagePreview('imgs/example.png', 'example.png', fileSize);
                        this.checkAlphaChannel();
                        resolve();
                    };
                    this.sourceImage.onerror = reject;
                    this.sourceImage.src = 'imgs/example.png';
                })
                .catch(() => {
                    // If unable to get size, just load the image
                    this.sourceImage = new Image();
                    this.sourceImage.crossOrigin = 'anonymous';
                    this.sourceImage.onload = () => {
                        this.updateImagePreview('imgs/example.png', 'example.png', null);
                        this.checkAlphaChannel();
                        resolve();
                    };
                    this.sourceImage.onerror = reject;
                    this.sourceImage.src = 'imgs/example.png';
                });
        });
    }
    
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.sourceImage = new Image();
                this.sourceImage.onload = () => {
                    this.updateImagePreview(e.target.result, file.name, file.size);
                    this.checkAlphaChannel();
                    this.processImage();
                };
                this.sourceImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    
    updateImagePreview(imageSrc, fileName, fileSize) {
        this.imagePreview.src = imageSrc;
        this.imageName.textContent = fileName.toUpperCase();
        this.imageSize.textContent = this.formatFileSize(fileSize);
        this.currentImageFileName = fileName;
    }
    
    handlePixelSizeChange(event) {
        this.pixelSize = parseInt(event.target.value);
        this.pixelSizeValue.textContent = this.pixelSize;
        
        // Debounce to avoid excessive reprocessing while dragging
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (this.sourceImage) {
                this.processImage();
            }
        }, 30);
    }
    
    handleBlendModeChange(event) {
        this.blendMode = event.target.value;
        if (this.sourceImage) {
            this.processImage();
        }
    }
    
    processImage() {
        if (!this.sourceImage || !this.textureImage) return;
        
        // Determine canvas size for centering relative to the entire viewport
        const padding = 40; // Container padding on both sides
        const maxWidth = window.innerWidth - padding;
        const maxHeight = window.innerHeight - padding;
        
        // Calculate dimensions while maintaining aspect ratio
        let canvasWidth = this.sourceImage.width;
        let canvasHeight = this.sourceImage.height;
        
        const scale = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight, 1);
        canvasWidth = Math.floor(canvasWidth * scale);
        canvasHeight = Math.floor(canvasHeight * scale);
        
        // Set canvas size
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Pixelate and apply texture
        this.applyPixelationWithTexture();
    }
    
    applyPixelationWithTexture() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const pixelSize = this.pixelSize;
        
        // Calculate number of cells
        const cols = Math.ceil(width / pixelSize);
        const rows = Math.ceil(height / pixelSize);
        
        // Get source image data
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = width;
        srcCanvas.height = height;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(this.sourceImage, 0, 0, width, height);
        const srcData = srcCtx.getImageData(0, 0, width, height).data;
        
        // Get scaled texture data (scale once, reuse for all cells)
        const texCanvas = document.createElement('canvas');
        texCanvas.width = pixelSize;
        texCanvas.height = pixelSize;
        const texCtx = texCanvas.getContext('2d');
        texCtx.drawImage(this.textureImage, 0, 0, pixelSize, pixelSize);
        const texData = texCtx.getImageData(0, 0, pixelSize, pixelSize).data;
        
        // Create output ImageData
        const outputImageData = this.ctx.createImageData(width, height);
        const output = outputImageData.data;
        
        // Process each cell
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cellX = col * pixelSize;
                const cellY = row * pixelSize;
                
                // Calculate average color of the cell
                const avgColor = this.getAverageColor(srcData, width, height, cellX, cellY, pixelSize);
                
                // Skip fully transparent cells
                if (this.hasAlphaChannel && avgColor.a === 0) {
                    continue;
                }
                
                // Fill cell pixels with blended color + texture
                this.fillCellWithTexture(output, width, height, cellX, cellY, pixelSize, avgColor, texData);
            }
        }
        
        // Put the result to canvas (single operation)
        this.ctx.putImageData(outputImageData, 0, 0);
    }
    
    getAverageColor(data, width, height, startX, startY, size) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;
        let opaqueCount = 0;
        
        const endX = Math.min(startX + size, width);
        const endY = Math.min(startY + size, height);
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const index = (y * width + x) * 4;
                const alpha = data[index + 3];
                
                if (this.hasAlphaChannel) {
                    if (alpha > 0) {
                        r += data[index];
                        g += data[index + 1];
                        b += data[index + 2];
                        a += alpha;
                        opaqueCount++;
                    }
                } else {
                    r += data[index];
                    g += data[index + 1];
                    b += data[index + 2];
                    a += alpha;
                    count++;
                }
            }
        }
        
        if (this.hasAlphaChannel) {
            if (opaqueCount > 0) {
                return {
                    r: (r / opaqueCount) | 0,
                    g: (g / opaqueCount) | 0,
                    b: (b / opaqueCount) | 0,
                    a: (a / opaqueCount) | 0
                };
            }
            return { r: 0, g: 0, b: 0, a: 0 };
        }
        
        return {
            r: (r / count) | 0,
            g: (g / count) | 0,
            b: (b / count) | 0,
            a: (a / count) | 0
        };
    }
    
    // Blend two color values based on blend mode
    blendChannel(base, blend, mode) {
        switch (mode) {
            case 'multiply':
                return (base * blend / 255) | 0;
            case 'screen':
                return (255 - ((255 - base) * (255 - blend) / 255)) | 0;
            case 'exclusion':
                return (base + blend - (2 * base * blend / 255)) | 0;
            default: // normal
                return blend;
        }
    }
    
    fillCellWithTexture(output, canvasWidth, canvasHeight, cellX, cellY, pixelSize, color, texData) {
        const cellAlpha = this.hasAlphaChannel ? color.a / 255 : 1;
        
        for (let ty = 0; ty < pixelSize; ty++) {
            const outY = cellY + ty;
            if (outY >= canvasHeight) break;
            
            for (let tx = 0; tx < pixelSize; tx++) {
                const outX = cellX + tx;
                if (outX >= canvasWidth) break;
                
                // Texture pixel index
                const texIndex = (ty * pixelSize + tx) * 4;
                const texR = texData[texIndex];
                const texG = texData[texIndex + 1];
                const texB = texData[texIndex + 2];
                const texA = texData[texIndex + 3] / 255;
                
                // Output pixel index
                const outIndex = (outY * canvasWidth + outX) * 4;
                
                // Blend base color with texture
                let finalR, finalG, finalB;
                
                if (this.blendMode === 'normal') {
                    // Normal mode: blend texture over base color using texture alpha
                    finalR = color.r * (1 - texA) + texR * texA;
                    finalG = color.g * (1 - texA) + texG * texA;
                    finalB = color.b * (1 - texA) + texB * texA;
                } else {
                    // Other blend modes: blend color channels, then apply texture alpha
                    const blendedR = this.blendChannel(color.r, texR, this.blendMode);
                    const blendedG = this.blendChannel(color.g, texG, this.blendMode);
                    const blendedB = this.blendChannel(color.b, texB, this.blendMode);
                    
                    // Mix blended result with base color using texture alpha
                    finalR = color.r * (1 - texA) + blendedR * texA;
                    finalG = color.g * (1 - texA) + blendedG * texA;
                    finalB = color.b * (1 - texA) + blendedB * texA;
                }
                
                // Apply cell alpha (for images with transparency)
                const finalAlpha = cellAlpha * 255;
                
                output[outIndex] = finalR | 0;
                output[outIndex + 1] = finalG | 0;
                output[outIndex + 2] = finalB | 0;
                output[outIndex + 3] = finalAlpha | 0;
            }
        }
    }
    
    downloadResult() {
        if (!this.sourceImage) return;
        
        const link = document.createElement('a');
        link.download = 'embroidery-stylized.png';
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new EmbroideryStylizer();
});

