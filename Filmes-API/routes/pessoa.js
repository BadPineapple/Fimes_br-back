const express = require('express');
const db = require('../db/db'); // Importa a conexão pool do MySQL
const verificarAcesso = require('../auth');

const router = express.Router();

// Validador para garantir que o nome da pessoa não esteja vazio
const formatarPessoa = (dados) => {
    if (!dados.pessoa || String(dados.pessoa).trim() === '') {
        throw new Error("O campo 'pessoa' é obrigatório.");
    }

    return {
        pessoa: String(dados.pessoa).trim()
    };
};

// GET: Listar todas as pessoas (atores, diretores, etc)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM TBLPES');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar pessoas no banco de dados." });
    }
});

// GET: Buscar pessoa por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM TBLPES WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: "Pessoa não encontrada" });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ erro: "Erro na consulta ao banco." });
    }
});

// POST: Cadastrar nova pessoa (Apenas Admin)
router.post('/', verificarAcesso(['admin']), async (req, res) => {
    try {
        const novaPessoa = formatarPessoa(req.body);

        // MySQL cuida do ID automático
        const [result] = await db.execute('INSERT INTO TBLPES SET ?', [novaPessoa]);

        res.status(201).json({ id: result.insertId, ...novaPessoa }); 
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

// PUT: Atualizar dados de uma pessoa
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const dadosAtualizados = formatarPessoa(req.body);

        const [result] = await db.execute('UPDATE TBLPES SET ? WHERE id = ?', [dadosAtualizados, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Pessoa não encontrada para atualização." });
        }

        res.json({ mensagem: "Pessoa atualizada com sucesso!", id, ...dadosAtualizados });
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

// DELETE: Remover pessoa (Apenas Admin)
router.delete('/:id', verificarAcesso(['admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const [result] = await db.execute('DELETE FROM TBLPES WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Pessoa não encontrada para exclusão." });
        }

        res.json({ mensagem: `Pessoa com ID ${id} removida com sucesso!` });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao deletar do banco de dados." });
    }
});

module.exports = router;