const express = require('express');
const db = require('./db'); // Importa a conexão com o MySQL
const verificarAcesso = require('./auth');

const router = express.Router();

const formatarFilme = (dados) => {
    return {
        titulo:    String(dados.titulo).trim(), 
        diretor:   String(dados.diretor).trim(),
        elenco:    String(dados.elenco).trim(),
        roterista: String(dados.roterista).trim(),
        genero:    String(dados.genero).trim(),
        sinopse:   String(dados.sinopse).trim(), 
        tags:      String(dados.tags).trim(),
        imagens:   String(dados.imagens).trim(),
        duracao:   String(dados.duracao).trim(),
        ano:       Number(dados.ano)
    };
};

// Rota para buscar TODOS os filmes
router.get('/', async (req, res) => {
    try {
        const [filmes] = await db.query('SELECT * FROM filmes');
        res.json(filmes);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar filmes no banco de dados." });
    }
});

router.post('/', verificarAcesso(['admin']),  (req, res) => {
    try{
       const filmes = util.lerJson(FilmesJson);
        const novoFilme = formatarPlataforma(req.body);

        if (!novoFilme.id) {
            novoFilme.id = filmes.length > 0 ? filmes[filmes.length - 1].id + 1 : 1;
        }

        filmes.push(novoFilme);
        util.salvarInfo(FilmesJson, filmes);

        res.status(201).json(novoFilme); 
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

// Rota para buscar um filme específico pelo ID
router.get('/:id', (req, res) => {
    const filmes = util.lerJson(FilmesJson);
    const { id } = req.params;
    const filme = filmes.find(f => f.id === parseInt(id));

    if (!filme) {
        res.status(404).json({ mensagem: "Filme não encontrado" });
    }

    res.json(filme);
});

router.put('/:id', (req, res) => {
    try {
        const filmes = util.lerJson(FilmesJson);
        const id = parseInt(req.params.id);

        // 1. Encontrar a posição (índice) do filme na lista
        const index = filmes.findIndex(f => f.id === id);

        if (index === -1) {
            return res.status(404).json({ erro: "Filme não encontrado para atualização." });
        }

        // 2. Validar os novos dados que vieram no corpo da requisição
        // Passamos o ID original para garantir que ele não mude
        const dadosAtualizados = formatarFilme({ ...req.body, id: id });

        // 3. Substituir o filme antigo pelo novo na nossa lista
        filmes[index] = dadosAtualizados;
        util.salvarInfo(FilmesJson, filmes);

        res.json({ mensagem: "Filme atualizado com sucesso!", filme: dadosAtualizados });

    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

router.delete('/:id', verificarAcesso(['admin']), (req, res) => {
    const filmes = util.lerJson(FilmesJson);
    const id = parseInt(req.params.id);

    // Verificamos se o filme existe antes de tentar deletar
    const filmeExiste = filmes.find(f => f.id === id);
    if (!filmeExiste) {
        return res.status(404).json({ erro: "Filme não encontrado para exclusão." });
    }

    // Filtramos a lista: "Mantenha todos que tenham o ID DIFERENTE do enviado"
    const novaLista = filmes.filter(f => f.id !== id);
    util.salvarInfo(FilmesJson, filmes);

    res.json({ mensagem: `Filme com ID ${id} removido com sucesso!` });
});

module.exports = router;