const express = require('express');
const fs = require('fs');
const path = require('path');
const util = require('./util.js');
const verificarAcesso = require('./auth');

const router = express.Router();

const PlataformaJson = path.join(__dirname, 'plataforma.json');

const formatarPlataforma = (dados) => {
    if (util.estaVazio(dados.plataforma) || 
        util.estaVazio(dados.link)) {
        throw new Error("'plataforma' e 'link' são obrigatórios e não podem estar vazios.");
    }

    return {
        id:         Number(dados.id),
        plataforma: String(dados.plataforma).trim(), 
        link:       String(dados.link).trim()
    };
};

router.get('/', (req, res) => {
    const plataforma = util.lerJson(PlataformaJson);
    res.json(plataforma);
});

router.get('/:id', (req, res) => {
    const plataformas = util.lerJson(PlataformaJson);
    const { id } = req.params;
    const plataforma = plataformas.find(f => f.id === parseInt(id));

    if (!plataforma) {
        res.status(404).json({ mensagem: "Plataforma não encontrado" });
    }

    res.json(plataforma);
});

router.post('/', verificarAcesso(['admin']),  (req, res) => {
    try{
       const plataformas = util.lerJson(PlataformaJson);
        const novaPlataforma = formatarPlataforma(req.body);

        if (!novaPlataforma.id) {
            novaPlataforma.id = plataformas.length > 0 ? plataformas[plataformas.length - 1].id + 1 : 1;
        }

        plataformas.push(novaPlataforma);
        util.salvarInfo(PlataformaJson, plataformas);

        res.status(201).json(novaPlataforma); 
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const plataformas = util.lerJson(PlataformaJson);
        const id = parseInt(req.params.id);

        const index = plataformas.findIndex(f => f.id === id);

        if (index === -1) {
            return res.status(404).json({ erro: "Plataforma não encontrado para atualização." });
        }

        const dadosAtualizados = formatarPlataforma({ ...req.body, id: id });

        plataformas[index] = dadosAtualizados;
        util.salvarInfo(PlataformaJson, plataformas);

        res.json({ mensagem: "Plataforma atualizado com sucesso!", plataforma: dadosAtualizados });

    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.delete('/:id', verificarAcesso(['admin']), (req, res) => {
    const plataformas = util.lerJson(PlataformaJson);
    const id = parseInt(req.params.id);

    const plataformaExiste = plataformas.find(f => f.id === id);
    if (!plataformaExiste) {
        return res.status(404).json({ erro: "Plataforma não encontrado para exclusão." });
    }

    const novaLista = plataformas.filter(f => f.id !== id);
    util.salvarInfo(PlataformaJson, novaLista);

    res.json({ mensagem: `Plataforma com ID ${id} removido com sucesso!` });
});

module.exports = router;