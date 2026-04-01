const express = require('express');
const router = express.Router();
const { recommendMovie, syncVectors, getRagStatus } = require( '../controllers/ragController.js');


router.post('/sync', syncVectors);
router.post('/recommend', recommendMovie);

router.get('/status', getRagStatus);

module.exports = router;