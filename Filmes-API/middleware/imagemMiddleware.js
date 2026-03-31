const multer = require('multer');

// 1. Configuração de Armazenamento
const storage = multer.memoryStorage();

// 2. Filtro de Segurança Refinado
const fileFilter = (req, file, cb) => {
    // Aceitamos apenas os tipos mais comuns e seguros
    const allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        // Criamos um erro personalizado que o Express pode capturar
        cb(new Error('Formato de arquivo inválido. Use apenas JPG, PNG, WebP ou GIF.'), false);
    }
};

// 3. Instância do Multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1 // Garante que apenas 1 arquivo seja enviado por vez
    },
    fileFilter: fileFilter
});

const uploadMiddleware = (req, res, next) => {
    const singleUpload = upload.single('imagem'); // 'imagem' é o nome do campo no FormData

    singleUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Erros específicos do Multer (ex: arquivo muito grande)
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ erro: "A imagem é muito grande! O limite é de 5MB." });
            }
            return res.status(400).json({ erro: `Erro no upload: ${err.message}` });
        } else if (err) {
            // Erros lançados pelo nosso fileFilter
            return res.status(400).json({ erro: err.message });
        }
        
        // Se tudo estiver OK, segue para o Controller
        next();
    });
};

module.exports = uploadMiddleware;