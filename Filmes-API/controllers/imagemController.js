const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const db = require('../db/db');

const imagemController = {
    // =========================================================
    // 1. FAZER UPLOAD E SALVAR NO REPOSITÓRIO
    // =========================================================
    uploadImagem: async (req, res) => {
        try {
            // Verifica se o middleware Multer conseguiu capturar o ficheiro
            if (!req.file) {
                return res.status(400).json({ erro: "Nenhuma imagem foi enviada." });
            }

            // 1. Captura os metadados enviados pelo frontend (via FormData)
            // Transforma 'true'/'false' ou '1'/'0' no formato correto (1 ou 0) para o MySQL
            let isPublic = 1; 
            if (req.body.public !== undefined) {
                isPublic = (req.body.public === 'false' || req.body.public === '0') ? 0 : 1;
            }
            
            const hint = req.body.hint || null;
            const tipo = req.body.tipo || 'geral'; // Ex: 'poster', 'perfil', 'backdrop'

            // 2. Prepara a pasta de destino dinamicamente baseada no 'tipo'
            const uploadDir = path.join(__dirname, `../public/uploads/imagens/${tipo}`);
            if (!fs.existsSync(uploadDir)) {
                // O { recursive: true } cria as subpastas automaticamente se não existirem
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // 3. Gera um nome único e define o caminho final
            const nomeArquivo = `${tipo}-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
            const caminhoCompleto = path.join(uploadDir, nomeArquivo);

            // 4. Mágica do Sharp: Comprime e converte para WebP
            await sharp(req.file.buffer)
                .webp({ quality: 80 }) // 80% de qualidade é excelente para web e muito leve
                .toFile(caminhoCompleto);

            // 5. Salva no Repositório de Imagens (TBLIMAGEM)
            const caminhoBanco = `/uploads/imagens/${tipo}/${nomeArquivo}`;
            
            const [result] = await db.execute(
                'INSERT INTO TBLIMAGEM (LOCAL, HINT, PUBLIC, TIPO) VALUES (?, ?, ?, ?)',
                [caminhoBanco, hint, isPublic, tipo]
            );

            // 6. Retorna o ID gerado para ser usado como Chave Estrangeira noutras tabelas
            res.status(201).json({
                mensagem: "Imagem enviada e guardada com sucesso!",
                idImagem: result.insertId, // Este é o ID que vai para TBLFIL ou TBLUSER
                local: caminhoBanco,
                hint: hint,
                tipo: tipo
            });

        } catch (error) {
            console.error("Erro ao processar e salvar imagem:", error);
            res.status(500).json({ erro: "Erro interno ao processar a imagem." });
        }
    },

    // =========================================================
    // 2. BUSCAR METADADOS DA IMAGEM POR ID
    // =========================================================
    buscarPorId: async (req, res) => {
        try {
            const { id } = req.params;

            // Busca os dados da imagem na tabela central
            const [rows] = await db.execute(
                'SELECT IDIMG, LOCAL, HINT, PUBLIC, TIPO FROM TBLIMAGEM WHERE IDIMG = ?', 
                [id]
            );

            // Se o ID não existir no banco
            if (rows.length === 0) {
                return res.status(404).json({ erro: "Imagem não encontrada no repositório." });
            }

            const imagem = rows[0];

            // Retorna os dados para o frontend (que usará o 'LOCAL' na tag <img>)
            res.json(imagem);

        } catch (error) {
            console.error("Erro ao buscar imagem por ID:", error);
            res.status(500).json({ erro: "Erro interno ao buscar os dados da imagem." });
        }
    }
};

module.exports = imagemController;