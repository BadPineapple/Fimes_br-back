const express = require('express');
const router = express.Router();
const filmeController = require('../controllers/filmeController.js');
const { somenteAdmin } = require('../auth'); // Ajustar o caminho do auth.js se necessário

// Buscar todos os filmes
router.get('/', filmeController.listarTodos);

// Buscar filme por ID
router.get('/:id', filmeController.buscarPorId);

// Criar filme (Apenas Admin)
router.post('/', somenteAdmin, filmeController.criar);

// Atualizar filme (Apenas Admin)
router.put('/:id', somenteAdmin, filmeController.atualizar);

// Apagar filme (Apenas Admin)
router.delete('/:id', somenteAdmin, filmeController.apagar);

module.exports = router;