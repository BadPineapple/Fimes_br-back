const express = require('express');
const db = require('../db/db'); // Conexão com o pool do MySQL
const verificarAcesso = require('../auth');

const router = express.Router();

// Validador para garantir que a tag não seja enviada vazia
const formatarTag = (dados) => {
    if (!dados.tag || String(dados.tag).trim() === '') {
        throw new Error("O campo 'tag' é obrigatório.");
    }

    return {
        tag: String(dados.tag).trim()
    };
};

// GET: Listar todas as tags
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM TBLTAG');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar tags no banco de dados." });
    }
});

// GET: Buscar tag por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM TBLTAG WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: "Tag não encontrada" });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar a tag." });
    }
});

// POST: Criar nova tag (Apenas Admin)
router.post('/', verificarAcesso(['admin']), async (req, res) => {
    try {
        const novaTag = formatarTag(req.body);

        // O MySQL gerencia o ID automaticamente
        const [result] = await db.execute('INSERT INTO TBLTAG SET ?', [novaTag]);

        res.status(201).json({ id: result.insertId, ...novaTag }); 
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

// PUT: Atualizar tag
router.put('/:id', verificarAcesso(['admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const dadosAtualizados = formatarTag(req.body);

        const [result] = await db.execute('UPDATE TBLTAG SET ? WHERE id = ?', [dadosAtualizados, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Tag não encontrada para atualização." });
        }

        res.json({ mensagem: "Tag atualizada com sucesso!", id, ...dadosAtualizados });
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

// DELETE: Remover tag (Apenas Admin)
router.delete('/:id', verificarAcesso(['admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const [result] = await db.execute('DELETE FROM TBLTAG WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Tag não encontrada para exclusão." });
        }

        res.json({ mensagem: `Tag com ID ${id} removida com sucesso!` });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao deletar tag." });
    }
});

module.exports = router;