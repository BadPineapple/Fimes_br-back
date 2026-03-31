const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises; // Usando versão baseada em Promises para não travar a Event Loop
const db = require('../db/db');

// Configurações e constantes
const ALLOWED_SUBFOLDERS = ['poster', 'perfil', 'backdrop', 'geral'];

const imagemController = {
    uploadImagem: async (req, res) => {
        let caminhoCompleto = null;

        try {
            if (!req.file) {
                return res.status(400).json({ erro: "Nenhuma imagem foi enviada." });
            }

            // 1. Validação e Higienização do 'tipo'
            // Impede ataques de Directory Traversal e organiza pastas inesperadas
            let tipo = req.body.tipo || 'geral';
            if (!ALLOWED_SUBFOLDERS.includes(tipo)) {
                tipo = 'geral';
            }

            // 2. Tratamento de Metadados
            const isPublic = (req.body.public === 'false' || req.body.public === '0') ? 0 : 1;
            const hint = req.body.hint ? req.body.hint.substring(0, 255) : null;

            // 3. Preparação do Diretório (Assíncrona)
            const uploadDir = path.join(__dirname, `../public/uploads/imagens/${tipo}`);
            await fs.mkdir(uploadDir, { recursive: true });

            // 4. Geração de Nome e Caminho
            const nomeArquivo = `${tipo}-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
            caminhoCompleto = path.join(uploadDir, nomeArquivo);

            // 5. Processamento com Sharp
            // .rotate() é essencial para corrigir orientação de fotos de celular (Exif)
            await sharp(req.file.buffer)
                .rotate() 
                .webp({ quality: 80, effort: 6 }) // effort 6 aumenta a compressão sem perder qualidade
                .toFile(caminhoCompleto);

            // 6. Persistência no Banco de Dados
            const caminhoBanco = `/uploads/imagens/${tipo}/${nomeArquivo}`;
            
            try {
                const [result] = await db.execute(
                    'INSERT INTO TBLIMAGEM (LOCAL, HINT, PUBLIC, TIPO) VALUES (?, ?, ?, ?)',
                    [caminhoBanco, hint, isPublic, tipo]
                );

                return res.status(201).json({
                    mensagem: "Imagem processada com sucesso!",
                    idImagem: result.insertId,
                    local: caminhoBanco
                });

            } catch (dbError) {
                // SE O BANCO FALHAR: Deletamos a imagem criada para não poluir o HD
                await fs.unlink(caminhoCompleto);
                throw dbError; // Repassa para o catch principal
            }

        } catch (error) {
            console.error("Erro crítico no Upload:", error);
            res.status(500).json({ erro: "Erro ao processar imagem no servidor." });
        }
    },

    buscarPorId: async (req, res) => {
        try {
            const { id } = req.params;

            const [rows] = await db.execute(
                'SELECT IDIMG, LOCAL, HINT, PUBLIC, TIPO FROM TBLIMAGEM WHERE IDIMG = ?', 
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ erro: "Imagem não encontrada." });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error("Erro na busca de imagem:", error);
            res.status(500).json({ erro: "Erro interno na consulta." });
        }
    }
};

module.exports = imagemController;