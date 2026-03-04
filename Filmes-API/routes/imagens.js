const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const verificarAcesso = require('../auth'); // O teu middleware de segurança

const router = express.Router();

// 1. Configuração do Multer (Validação e Memória)
const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB em bytes

const upload = multer({
    storage: multer.memoryStorage(), // Guarda na RAM para o Sharp processar antes de ir para o disco
    limits: { fileSize: TAMANHO_MAXIMO },
    fileFilter: (req, file, cb) => {
        // Valida se o ficheiro enviado é realmente uma imagem (qualquer formato)
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Formato inválido. Por favor, envia apenas imagens.'));
        }
    }
});

// --- ROTA DE UPLOAD (CREATE) ---
// Usamos upload.single('imagem') para dizer que esperamos um ficheiro no campo "imagem"
router.post('/', verificarAcesso(['admin', 'editor']), upload.single('imagem'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ erro: "Nenhuma imagem foi enviada." });
        }

        // Criar um nome único para o novo ficheiro (Sempre em .webp)
        const nomeFicheiro = `img_${Date.now()}.webp`;
        
        // Caminho absoluto onde o ficheiro será guardado
        const caminhoDestino = path.join(__dirname, '../../uploads', nomeFicheiro);

        // 2. Processamento com Sharp (Compressão e Conversão)
        await sharp(req.file.buffer)
            .webp({ quality: 80 }) // Converte para WebP com 80% de qualidade (excelente peso/benefício)
            .toFile(caminhoDestino);

        res.status(201).json({ 
            mensagem: "Imagem processada e guardada com sucesso!",
            nomeFicheiro: nomeFicheiro,
            url: `/uploads/${nomeFicheiro}` // Esta é a URL que vais guardar na tabela de Filmes
        });

    } catch (error) {
        res.status(500).json({ erro: "Erro ao processar imagem: " + error.message });
    }
});

// --- ROTA DE APAGAR (DELETE) ---
router.delete('/:nomeFicheiro', verificarAcesso(['admin']), (req, res) => {
    const { nomeFicheiro } = req.params;
    const caminhoFicheiro = path.join(__dirname, '../../uploads', nomeFicheiro);

    // Verifica se o ficheiro existe no disco
    fs.access(caminhoFicheiro, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ erro: "Imagem não encontrada." });
        }

        // Apaga o ficheiro
        fs.unlink(caminhoFicheiro, (erroApagar) => {
            if (erroApagar) {
                return res.status(500).json({ erro: "Erro ao apagar a imagem do servidor." });
            }
            res.json({ mensagem: "Imagem removida com sucesso!" });
        });
    });
});

module.exports = router;