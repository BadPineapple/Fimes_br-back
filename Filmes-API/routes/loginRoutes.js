const express = require('express');
const router = express.Router();

// Importa o controlador e o middleware de autenticação atualizado
const loginController = require('../controllers/loginController');
const { verificarAcesso, somenteAdmin } = require('../auth'); // Ajuste o caminho se necessário

// Mapeamento das rotas para as funções do controlador
router.get('/', somenteAdmin, loginController.listarUsuarios);
router.get('/:id', verificarAcesso(), loginController.buscarPorId);

router.post('/registrar', loginController.registrar);
router.post('/verificar-email', loginController.verificarEmail);
router.post('/login', loginController.login);
router.post('/google', loginController.loginGoogle);

router.put('/login/:id', verificarAcesso(), loginController.atualizarLogin); 
router.put('/perfil/:id', verificarAcesso(), loginController.atualizarUser);

router.delete('/:id', somenteAdmin, loginController.apagar);
router.delete('/desativar/:id', somenteAdmin, loginController.desativar);

module.exports = router;