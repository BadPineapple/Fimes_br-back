const express = require('express');
const router = express.Router();
const opcoesController = require('../controllers/opcoesController');
const { somenteAdmin } = require('../auth'); // Ajustar o caminho do auth.js se necessário

// Não requerem autenticação estrita para leitura, pois o formulário precisa carregar as opções
router.get('/generos', opcoesController.listarGeneros);
router.get('/tags', opcoesController.listarTags);
router.get('/plataformas', opcoesController.listarPlataformas);
router.get('/pessoas', opcoesController.listarPessoas);

router.post('/addGeneros', somenteAdmin, opcoesController.criarGenero);
router.post('/addTags', somenteAdmin, opcoesController.criarTag);
router.post('/addPlataformas', somenteAdmin, opcoesController.criarPlataforma);
router.post('/addPessoas', somenteAdmin, opcoesController.criarPessoa);

router.get('/generos/:id', opcoesController.buscarGeneroPorId);
router.get('/tags/:id', opcoesController.buscarTagPorId);
router.get('/plataformas/:id', opcoesController.buscarPlataformaPorId);
router.get('/pessoas/:id', opcoesController.buscarPessoaPorId);

router.put('/altGeneros/:id', somenteAdmin, opcoesController.atualizarGenero);
router.put('/altTags/:id', somenteAdmin, opcoesController.atualizarTag);
router.put('/altPlataformas/:id', somenteAdmin, opcoesController.atualizarPlataforma);
router.put('/altPessoas/:id', somenteAdmin, opcoesController.atualizarPessoa);

router.delete('/delGeneros/:id', somenteAdmin, opcoesController.apagarGenero);
router.delete('/delTags/:id', somenteAdmin, opcoesController.apagarTag);
router.delete('/delPlataformas/:id', somenteAdmin, opcoesController.apagarPlataforma);
router.delete('/delPessoas/:id', somenteAdmin, opcoesController.apagarPessoa);

module.exports = router;