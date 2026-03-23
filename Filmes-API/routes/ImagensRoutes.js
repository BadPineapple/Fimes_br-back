const express = require('express');
const router = express.Router();

const upload = require('../middleware/imagemMiddleware');
const imagemController = require('../controllers/imagemController');
const { verificarAcesso } = require('../auth');

router.post('/upload', verificarAcesso(), upload.single('imagem'), imagemController.uploadImagem);

router.get('/:id', imagemController.buscarPorId);

module.exports = router;