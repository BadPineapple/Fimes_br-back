const express = require('express');
const fs = require('fs');
const path = require('path');
const util = require('./util.js');
const verificarAcesso = require('./auth');

const router = express.Router();

const PessoaJson = path.join(__dirname, 'pessoa.json');

const formatarPessoa = (dados) => {
    if (util.estaVazio(dados.pessoa)) {
        throw new Error("'pessoa' não podem estar vazios.");
    }

    return {
        id:     Number(dados.id),
        pessoa: String(dados.pessoa)
    };
};

router.get('/', (req, res) => {
    const pessoa = util.lerJson(PessoaJson);
    res.json(pessoa);
});

router.get('/:id', (req, res) => {
    const pessoas = util.lerJson(PessoaJson);
    const { id } = req.params;
    const pessoa = pessoas.find(f => f.id === parseInt(id));

    if (!pessoa) {
        res.status(404).json({ mensagem: "pessoa não encontrado" });
    }

    res.json(pessoa);
});

router.post('/', verificarAcesso(['admin']),  (req, res) => {
    try{
       const pessoas = util.lerJson(PessoaJson);
        const novaPessoa = formatarPlataforma(req.body);

        if (!novaPessoa.id) {
            novaPessoa.id = pessoas.length > 0 ? pessoas[pessoas.length - 1].id + 1 : 1;
        }

        pessoas.push(novaPessoa);
        util.salvarInfo(PessoaJson, pessoas);

        res.status(201).json(novaPessoa); 
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const pessoas = util.lerJson(PessoaJson);
        const id = parseInt(req.params.id);

        const index = pessoas.findIndex(f => f.id === id);

        if (index === -1) {
            return res.status(404).json({ erro: "Plataforma não encontrado para atualização." });
        }

        const dadosAtualizados = formatarPlataforma({ ...req.body, id: id });

        pessoas[index] = dadosAtualizados;
        util.salvarInfo(PessoaJson, pessoas);

        res.json({ mensagem: "pessoa atualizado com sucesso!", pessoa: dadosAtualizados });

    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.delete('/:id', verificarAcesso(['admin']), (req, res) => {
    const pessoas = util.lerJson(PessoaJson);
    const id = parseInt(req.params.id);

    const pessoaExiste = pessoas.find(f => f.id === id);
    if (!pessoaExiste) {
        return res.status(404).json({ erro: "pessoa não encontrado para exclusão." });
    }

    const novaLista = pessoas.filter(f => f.id !== id);
    util.salvarInfo(PessoaJson, novaLista);

    res.json({ mensagem: `pessoa com ID ${id} removido com sucesso!` });
});

module.exports = router;