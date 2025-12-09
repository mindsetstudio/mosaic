class EmbroideryStylizer {
    constructor() {
        this.canvas = document.getElementById('resultCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.imageInput = document.getElementById('imageInput');
        this.textureSelect = document.getElementById('textureSelect');
        this.textureInput = document.getElementById('textureInput');
        this.pixelSizeSlider = document.getElementById('pixelSize');
        this.pixelSizeValue = document.getElementById('pixelSizeValue');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        this.sourceImage = null;
        this.textureImage = null;
        this.pixelSize = 15;
        this.textures = {}; // Хранилище текстур: { name: { path, image } }
        this.currentTextureName = null;
        
        this.init();
    }
    
    async init() {
        // Инициализируем список текстур
        this.initializeTextures();
        
        // Загружаем изображение по умолчанию
        await this.loadDefaultImage();
        
        // Настраиваем обработчики событий
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.textureSelect.addEventListener('change', (e) => this.handleTextureChange(e));
        this.textureInput.addEventListener('change', (e) => this.handleTextureUpload(e));
        this.pixelSizeSlider.addEventListener('input', (e) => this.handlePixelSizeChange(e));
        this.downloadBtn.addEventListener('click', () => this.downloadResult());
        
        // Загружаем первую текстуру и обрабатываем изображение
        if (this.textureSelect.options.length > 0) {
            await this.loadTexture(this.textureSelect.options[0].value);
        }
        this.processImage();
    }
    
    formatTextureName(fileName) {
        // Удаляем расширение файла (точку и всё после неё)
        const nameWithoutExtension = fileName.replace(/\.[^.]*$/, '');
        // Преобразуем в заглавные буквы
        return nameWithoutExtension.toUpperCase();
    }
    
    initializeTextures() {
        // Список доступных текстур в папке textures
        const textureList = ['embroidery.jpg', 'ovals.jpg', 'puzzle.jpg'];
        
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
        // Проверяем, есть ли уже загруженная текстура
        if (this.textures[textureName] && this.textures[textureName].image) {
            this.textureImage = this.textures[textureName].image;
            this.currentTextureName = textureName;
            // Устанавливаем выбранную текстуру в select
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
                // Устанавливаем выбранную текстуру в select
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
                    
                    // Добавляем в select
                    const option = document.createElement('option');
                    option.value = textureName;
                    option.textContent = this.formatTextureName(file.name);
                    this.textureSelect.appendChild(option);
                    this.textureSelect.value = textureName;
                    
                    // Применяем текстуру
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
    
    async loadDefaultImage() {
        return new Promise((resolve, reject) => {
            this.sourceImage = new Image();
            this.sourceImage.crossOrigin = 'anonymous';
            this.sourceImage.onload = () => resolve();
            this.sourceImage.onerror = reject;
            this.sourceImage.src = 'imgs/example.png';
        });
    }
    
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.sourceImage = new Image();
                this.sourceImage.onload = () => {
                    this.processImage();
                };
                this.sourceImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    
    handlePixelSizeChange(event) {
        this.pixelSize = parseInt(event.target.value);
        this.pixelSizeValue.textContent = this.pixelSize;
        if (this.sourceImage) {
            this.processImage();
        }
    }
    
    processImage() {
        if (!this.sourceImage || !this.textureImage) return;
        
        // Определяем размер canvas для центрирования относительно всего вьюпорта
        const padding = 40; // padding контейнера с двух сторон
        const maxWidth = window.innerWidth - padding;
        const maxHeight = window.innerHeight - padding;
        
        // Вычисляем размеры с сохранением пропорций
        let canvasWidth = this.sourceImage.width;
        let canvasHeight = this.sourceImage.height;
        
        const scale = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight, 1);
        canvasWidth = Math.floor(canvasWidth * scale);
        canvasHeight = Math.floor(canvasHeight * scale);
        
        // Устанавливаем размер canvas
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        // Очищаем canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Пикселизируем и накладываем текстуру
        this.applyPixelationWithTexture();
    }
    
    applyPixelationWithTexture() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const pixelSize = this.pixelSize;
        
        // Вычисляем количество ячеек (всегда квадратные)
        const cols = Math.ceil(width / pixelSize);
        const rows = Math.ceil(height / pixelSize);
        
        // Рисуем исходное изображение на временный canvas для получения данных
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.sourceImage, 0, 0, width, height);
        
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Создаем отдельный canvas для текстуры
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = pixelSize;
        textureCanvas.height = pixelSize;
        const textureCtx = textureCanvas.getContext('2d');
        
        // Обрабатываем каждую ячейку
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * pixelSize;
                const y = row * pixelSize;
                
                // Вычисляем средний цвет ячейки
                const avgColor = this.getAverageColor(data, width, height, x, y, pixelSize);
                
                // Рисуем текстуру с режимом multiply
                this.drawTexturedPixel(x, y, pixelSize, avgColor, textureCanvas, textureCtx);
            }
        }
    }
    
    getAverageColor(data, width, height, startX, startY, size) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;
        
        const endX = Math.min(startX + size, width);
        const endY = Math.min(startY + size, height);
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const index = (y * width + x) * 4;
                r += data[index];
                g += data[index + 1];
                b += data[index + 2];
                a += data[index + 3];
                count++;
            }
        }
        
        return {
            r: Math.floor(r / count),
            g: Math.floor(g / count),
            b: Math.floor(b / count),
            a: Math.floor(a / count)
        };
    }
    
    drawTexturedPixel(x, y, size, color, textureCanvas, textureCtx) {
        // Очищаем текстуру canvas
        textureCtx.clearRect(0, 0, size, size);
        
        // Рисуем цветной фон
        textureCtx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        textureCtx.fillRect(0, 0, size, size);
        
        // Рисуем текстуру с режимом multiply
        textureCtx.globalCompositeOperation = 'multiply';
        textureCtx.drawImage(this.textureImage, 0, 0, size, size);
        textureCtx.globalCompositeOperation = 'source-over';
        
        // Копируем результат на основной canvas
        this.ctx.drawImage(textureCanvas, x, y);
    }
    
    downloadResult() {
        if (!this.sourceImage) return;
        
        const link = document.createElement('a');
        link.download = 'embroidery-stylized.png';
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new EmbroideryStylizer();
});

