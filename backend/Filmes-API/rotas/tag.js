const express = require('express');
const fs = require('fs');
const path = require('path');
const util = require('./util.js');
const verificarAcesso = require('./auth');

const router = express.Router();

const TagsJson = path.join(__dirname, 'tags.json');

const formatarTag = (dados) => {
    if (util.estaVazio(dados.tag)) {
        throw new Error("'tag' não podem estar vazios.");
     }

    return {
        id: Number(dados.id),
        tag: String(dados.tag)
    };
};


router.get('/', (req, res) => {
    const tag = util.lerJson(TagsJson);
    res.json(tag);
});

router.get('/:id', (req, res) => {
    const tags = util.lerJson(TagsJson);
    const { id } = req.params;
    const tag = tags.find(f => f.id === parseInt(id));

    if (!tag) {
        res.status(404).json({ mensagem: "tag não encontrado" });
    }

    res.json(tag);
});

router.post('/', verificarAcesso(['admin']),  (req, res) => {
    try{
       const tags = util.lerJson(TagsJson);
        const novatag = formatarTag(req.body);

        if (!novatag.id) {
            novatag.id = tags.length > 0 ? tags[tags.length - 1].id + 1 : 1;
        }

        tags.push(novatag);
        util.salvarInfo(TagsJson, tags);

        res.status(201).json(novatag); 
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const tags = util.lerJson(TagsJson);
        const id = parseInt(req.params.id);

        const index = tags.findIndex(f => f.id === id);

        if (index === -1) {
            return res.status(404).json({ erro: "tag não encontrado para atualização." });
        }

        const dadosAtualizados = formatarTag({ ...req.body, id: id });

        tags[index] = dadosAtualizados;
        util.salvarInfo(TagsJson, tags);

        res.json({ mensagem: "tag atualizado com sucesso!", tag: dadosAtualizados });

    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.delete('/:id', verificarAcesso(['admin']), (req, res) => {
    const tags = util.lerJson(TagsJson);
    const id = parseInt(req.params.id);

    const tagExiste = tags.find(f => f.id === id);
    if (!tagExiste) {
        return res.status(404).json({ erro: "tag não encontrado para exclusão." });
    }

    const novaLista = tags.filter(f => f.id !== id);
    util.salvarInfo(TagsJson, novaLista);

    res.json({ mensagem: `tag com ID ${id} removido com sucesso!` });
});


module.exports = router;