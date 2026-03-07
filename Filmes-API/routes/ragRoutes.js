const express = require('express');
const router = express.Router();
const { recommendMovie, syncVectors, getRagStatus } = require( '../controllers/ragController.js');

// Rota onde o usuário envia a descrição (ex: "quero um filme de drama no sertão")
router.post('/recommend', recommendMovie);

// Rota administrativa para gerar/atualizar a coluna SEACONT e os vetores
router.post('/sync', syncVectors);

router.get('/status', getRagStatus);

module.exports = router;