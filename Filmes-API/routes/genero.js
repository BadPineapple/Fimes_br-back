const express = require('express');
const db = require('../db/db'); // Conexão com o pool do MySQL
const verificarAcesso = require('../auth');

const router = express.Router();

// Validador simples para garantir que o texto não venha vazio
const formatarGenero = (dados) => {
    if (!dados.genero || String(dados.genero).trim() === '') {
        throw new Error("O campo 'genero' é obrigatório.");
    }

    return {
        genero: String(dados.genero).trim()
    };
};

// GET: Listar todos os gêneros
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM TBLGEN');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar gêneros no banco." });
    }
});

// GET: Buscar gênero por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM TBLGEN WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: "Gênero não encontrado" });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ erro: "Erro na consulta." });
    }
});

// POST: Criar novo gênero (Apenas Admin)
router.post('/', verificarAcesso(['admin']), async (req, res) => {
    try {
        const novoGenero = formatarGenero(req.body);

        // O MySQL cuida do ID automático (Auto Increment)
        const [result] = await db.execute('INSERT INTO TBLGEN SET ?', [novoGenero]);

        res.status(201).json({ id: result.insertId, ...novoGenero }); 
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

// PUT: Atualizar gênero
router.put('/:id', verificarAcesso(['admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const dadosAtualizados = formatarGenero(req.body);

        const [result] = await db.execute('UPDATE TBLGEN SET ? WHERE id = ?', [dadosAtualizados, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Gênero não encontrado para atualização." });
        }

        res.json({ mensagem: "Gênero atualizado com sucesso!", id, ...dadosAtualizados });

    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

// DELETE: Remover gênero (Apenas Admin)
router.delete('/:id', verificarAcesso(['admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const [result] = await db.execute('DELETE FROM TBLGEN WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Gênero não encontrado para exclusão." });
        }

        res.json({ mensagem: `Gênero com ID ${id} removido com sucesso!` });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao deletar gênero." });
    }
});

module.exports = router;