const express = require('express');
const router = express.Router();
const pessoasController = require('../controllers/pessoasController'); // Ajuste o caminho se a sua pasta tiver outro nome

// Rota para listar todas as pessoas (com a filmografia agrupada)
router.get('/', pessoasController.listar);

// Rota para buscar uma pessoa específica pelo ID (com a filmografia)
router.get('/:id', pessoasController.buscarPorId);

// Rota para criar uma nova pessoa
router.post('/', pessoasController.criar);

// Rota para atualizar uma pessoa e sua filmografia
router.put('/:id', pessoasController.atualizar);

// Rota para deletar uma pessoa
router.delete('/:id', pessoasController.apagar);

module.exports = router;