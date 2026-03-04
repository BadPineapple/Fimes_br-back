// 1. Configuração de Variáveis de Ambiente (Sempre no topo)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

// 2. Importação das Rotas
const authRoutes       = require('./routes/loginRoutes'); // Login e Registro
const filmeRoutes      = require('./routes/filme');
const generoRoutes     = require('./routes/genero');
const plataformaRoutes = require('./routes/plataforma');
const tagRoutes        = require('./routes/tag');
const pessoaRoutes     = require('./routes/pessoa');
const imagensRoutes    = require('./routes/imagens');

// 3. Middlewares Globais
app.use(cors({
    origin: 'http://localhost:8080', // A porta exata do seu frontend Vite
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'] // Essencial para passar o Token JWT e receber ficheiros
})); 
app.use(express.json()); // Permite que a API receba dados em formato JSON

// 4. Definição das Rotas (Endpoints)

// Se alguém aceder a http://localhost:3000/uploads/img_123.webp, vai ver a imagem
//app.use('/imagens', express.static(path.join(__dirname, 'uploads')));

// Rota de Boas-vindas
app.get('/', (req, res) => {
    res.json({ mensagem: '🎬 Bem-vindo à API de Filmes Pro!', status: 'Online' });
});

// Rotas de Autenticação (Pública)
app.use('/auth', authRoutes);

// Rotas de Conteúdo (Protegidas ou Públicas dependendo do método)
app.use('/tags',        tagRoutes);
app.use('/pessoas',     pessoaRoutes);
app.use('/filmes',      filmeRoutes);
app.use('/generos',     generoRoutes);
app.use('/plataformas', plataformaRoutes);
app.use('/imagens',     imagensRoutes);


// 5. Tratamento de Erro 404 (Rota não encontrada)
app.use((req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada.' });
});

// 6. Iniciando o servidor usando a porta do .env
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📌 Banco de Dados conectado via MySQL`);
});