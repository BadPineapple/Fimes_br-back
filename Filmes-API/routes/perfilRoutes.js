const express = require('express');
const router = express.Router();
const perfilController = require('../controllers/perfilController');
const { verificarAcesso } = require('../auth'); // O seu middleware de JWT

// Rota GET para o perfil. Usamos verificarAcesso() se o perfil for privado,
// ou pode remover o middleware se quiser que os perfis sejam públicos para qualquer visitante.
router.get('/:id', perfilController.obterPerfilCompleto);
router.put('/:id', perfilController.atualizarPerfil);

module.exports = router;