const express = require('express');
const app = express();
const PORT = 3000;

const Filmes   = require('./rotas/filmes');
const Genero   = require('./rotas/genero');
const Assistir = require('./rotas/assistir');
const Tag      = require('./rotas/util');

app.use(cors());

// Middleware para permitir que a API entenda JSON
app.use(express.json());

// Rota principal (Home)
app.get('/', (req, res) => {
    res.send('🎬 Bem-vindo à API de Filmes!');
});

app.use('/filmes', Filmes);
app.use('/assistir', Genero);
app.use('/genero', Assistir);
app.use('/tag', Tag);

// Iniciando o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
