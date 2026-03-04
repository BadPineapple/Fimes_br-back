const express = require('express');
const db = require('../db/db'); // Importa a conexão pool do MySQL
const verificarAcesso = require('../auth');

const router = express.Router();

// Função para validar se os campos obrigatórios estão presentes
const formatarPlataforma = (dados) => {
    if (!dados.plataforma || String(dados.plataforma).trim() === '' || 
        !dados.link || String(dados.link).trim() === '') {
        throw new Error("'plataforma' e 'link' são obrigatórios e não podem estar vazios.");
    }

    return {
        plataforma: String(dados.plataforma).trim(), 
        link:       String(dados.link).trim()
    };
};

// GET: Listar todas as plataformas
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM TBLPLA');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar plataformas no banco de dados." });
    }
});

// GET: Buscar uma plataforma específica pelo ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM TBLPLA WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: "Plataforma não encontrada" });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao realizar a busca." });
    }
});

// POST: Adicionar nova plataforma (Apenas Admin)
router.post('/', verificarAcesso(['admin']), async (req, res) => {
    try {
        const novaPlataforma = formatarPlataforma(req.body);

        // O MySQL gera o ID automaticamente
        const [result] = await db.execute('INSERT INTO TBLPLA SET ?', [novaPlataforma]);

        res.status(201).json({ id: result.insertId, ...novaPlataforma }); 
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

// PUT: Atualizar dados de uma plataforma
router.put('/:id', verificarAcesso(['admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const dadosAtualizados = formatarPlataforma(req.body);

        const [result] = await db.execute('UPDATE TBLPLA SET ? WHERE id = ?', [dadosAtualizados, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Plataforma não encontrada para atualização." });
        }

        res.json({ mensagem: "Plataforma atualizada com sucesso!", id, ...dadosAtualizados });

    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

// DELETE: Remover uma plataforma (Apenas Admin)
router.delete('/:id', verificarAcesso(['admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const [result] = await db.execute('DELETE FROM TBLPLA WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Plataforma não encontrada para exclusão." });
        }

        res.json({ mensagem: `Plataforma com ID ${id} removida com sucesso!` });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao deletar plataforma." });
    }
});

module.exports = router;