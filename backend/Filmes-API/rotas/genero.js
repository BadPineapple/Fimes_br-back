const express = require('express');
const fs = require('fs');
const path = require('path');
const util = require('./util.js');
const verificarAcesso = require('./auth');

const router = express.Router();

const GeneroJson = path.join(__dirname, 'generos.json');

const formatarGenero = (dados) => {
    if (util.estaVazio(dados.genero)) {
        throw new Error("'genero' não podem estar vazios.");
    }

    return {
        id:     Number(dados.id),
        genero: String(dados.genero)
    };
};

router.get('/', (req, res) => {
    const genero = util.lerJson(GeneroJson);
    res.json(genero);
});

router.get('/:id', (req, res) => {
    const generos = util.lerJson(GeneroJson);
    const { id } = req.params;
    const genero = generos.find(f => f.id === parseInt(id));

    if (!genero) {
        res.status(404).json({ mensagem: "genero não encontrado" });
    }

    res.json(genero);
});

router.post('/', verificarAcesso(['admin']),  (req, res) => {
    try{
       const generos = util.lerJson(GeneroJson);
        const novoGenero = formatarPlataforma(req.body);

        if (!novoGenero.id) {
            novoGenero.id = generos.length > 0 ? generos[generos.length - 1].id + 1 : 1;
        }

        generos.push(novoGenero);
        util.salvarInfo(GeneroJson, generos);

        res.status(201).json(novoGenero); 
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const generos = util.lerJson(GeneroJson);
        const id = parseInt(req.params.id);

        const index = generos.findIndex(f => f.id === id);

        if (index === -1) {
            return res.status(404).json({ erro: "Plataforma não encontrado para atualização." });
        }

        const dadosAtualizados = formatarPlataforma({ ...req.body, id: id });

        generos[index] = dadosAtualizados;
        util.salvarInfo(GeneroJson, generos);

        res.json({ mensagem: "Genero atualizado com sucesso!", genero: dadosAtualizados });

    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.delete('/:id', verificarAcesso(['admin']), (req, res) => {
    const generos = util.lerJson(GeneroJson);
    const id = parseInt(req.params.id);

    const generoExiste = generos.find(f => f.id === id);
    if (!generoExiste) {
        return res.status(404).json({ erro: "Genero não encontrado para exclusão." });
    }

    const novaLista = generos.filter(f => f.id !== id);
    util.salvarInfo(GeneroJson, novaLista);

    res.json({ mensagem: `Genero com ID ${id} removido com sucesso!` });
});

module.exports = router;