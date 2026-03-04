const express = require('express');
const router = express.Router();

// Importamos o controlador e o middleware de autenticação
const listController = require('../controllers/listController');
const { autenticado } = require('../auth'); // Ajuste o caminho se a sua pasta se chamar apenas 'middleware'

// Todas as rotas abaixo requerem que o utilizador tenha a sessão iniciada (token válido)

// 1. Criar uma nova lista
router.post('/criar', autenticado, listController.criarLista);

// 2. Adicionar um filme a uma lista existente
router.post('/adicionar-filme', autenticado, listController.adicionarFilme);

// 3. Seguir a lista de outro utilizador
router.post('/seguir', autenticado, listController.seguirLista);

// 4. Curtir uma lista
router.post('/curtir', autenticado, listController.curtirLista);

module.exports = router;