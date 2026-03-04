const express = require('express');
const db = require('../db/db'); // Importa a conexão com o MySQL
const verificarAcesso = require('../auth');

const router = express.Router();

// Função auxiliar para extrair apenas os dados da tabela principal do filme
const extrairDadosBaseFilme = (dados) => {
    return {
        titulo: String(dados.titulo || '').trim(),
        sinopse: String(dados.sinopse || '').trim(),
        imagens: String(dados.imagens || '').trim(),
        duracao: String(dados.duracao || '').trim(),
        ano: Number(dados.ano) || null,
        tmdb_id: dados.tmdb_id ? Number(dados.tmdb_id) : null,
        nota_externa: dados.nota_externa ? parseFloat(dados.nota_externa) : null
    };
};

// ==========================================
// Rota para buscar TODOS os filmes
// ==========================================
router.get('/', async (req, res) => {
    try {
        const [filmes] = await db.execute('SELECT * FROM TBLFIL');
        res.json(filmes);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar filmes no banco de dados." });
    }
});

// ==========================================
// Rota para buscar UM filme específico por ID
// ==========================================
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [filmes] = await db.execute('SELECT * FROM TBLFIL WHERE id = ?', [id]);

        if (filmes.length === 0) {
            return res.status(404).json({ mensagem: "Filme não encontrado" });
        }

        res.json(filmes[0]);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar o filme." });
    }
});

// ==========================================
// Rota para ADICIONAR um filme e as suas relações (Apenas Admin)
// ==========================================
router.post('/', verificarAcesso(['admin']), async (req, res) => {
    const conexao = await db.getConnection(); 
    try {
        await conexao.beginTransaction(); 
        
        const dadosBase = extrairDadosBaseFilme(req.body);
        const { elenco, diretor, roterista, generos, tags, plataformas } = req.body; 

        // 1. Inserir o filme na tabela principal
        const [resultFilme] = await conexao.query('INSERT INTO TBLFIL SET ?', [dadosBase]);
        const filmeId = resultFilme.insertId;

        // 2. Função auxiliar para inserir as relações
        const inserirRelacao = async (tabela, colunaId, valores, extraInfo = null) => {
            if (valores && Array.isArray(valores) && valores.length > 0) {
                for (let id of valores) {
                    if (extraInfo) {
                        await conexao.query(`INSERT INTO ${tabela} (filme_id, ${colunaId}, funcao) VALUES (?, ?, ?)`, [filmeId, id, extraInfo]);
                    } else {
                        await conexao.query(`INSERT INTO ${tabela} (filme_id, ${colunaId}) VALUES (?, ?)`, [filmeId, id]);
                    }
                }
            }
        };

        // 3. Inserir nas tabelas de junção
        await inserirRelacao('TBLFIL_PES', 'pessoa_id', elenco, 'Elenco');
        await inserirRelacao('TBLFIL_PES', 'pessoa_id', diretor, 'Diretor');
        await inserirRelacao('TBLFIL_PES', 'pessoa_id', roterista, 'Roterista');
        await inserirRelacao('TBLFIL_GEN', 'genero_id', generos);
        await inserirRelacao('TBLFIL_TAG', 'tag_id', tags);
        await inserirRelacao('TBLFIL_PLA', 'plataforma_id', plataformas);

        await conexao.commit(); 
        res.status(201).json({ mensagem: "Filme adicionado com sucesso!", id: filmeId });

    } catch (error) {
        await conexao.rollback(); 
        res.status(500).json({ erro: "Erro ao adicionar filme e relações.", detalhe: error.message });
    } finally {
        conexao.release(); 
    }
});

// ==========================================
// Rota para ATUALIZAR um filme e as suas relações (Apenas Admin)
// ==========================================
router.put('/:id', verificarAcesso(['admin']), async (req, res) => {
    const conexao = await db.getConnection();
    try {
        await conexao.beginTransaction();
        const idFilme = parseInt(req.params.id);
        const dadosBase = extrairDadosBaseFilme(req.body);
        const { elenco, diretor, roterista, generos, tags, plataformas } = req.body;

        // 1. Atualizar dados base na TBLFIL
        const [resultUpdate] = await conexao.query('UPDATE TBLFIL SET ? WHERE id = ?', [dadosBase, idFilme]);
        
        if (resultUpdate.affectedRows === 0) {
            await conexao.rollback();
            return res.status(404).json({ erro: "Filme não encontrado para atualização." });
        }

        // 2. Apagar relações antigas
        await conexao.query('DELETE FROM TBLFIL_PES WHERE filme_id = ?', [idFilme]);
        await conexao.query('DELETE FROM TBLFIL_GEN WHERE filme_id = ?', [idFilme]);
        await conexao.query('DELETE FROM TBLFIL_TAG WHERE filme_id = ?', [idFilme]);
        await conexao.query('DELETE FROM TBLFIL_PLA WHERE filme_id = ?', [idFilme]);

        // 3. Função auxiliar para inserir novas relações
        const inserirRelacao = async (tabela, colunaId, valores, extraInfo = null) => {
            if (valores && Array.isArray(valores) && valores.length > 0) {
                for (let id of valores) {
                    if (extraInfo) {
                        await conexao.query(`INSERT INTO ${tabela} (filme_id, ${colunaId}, funcao) VALUES (?, ?, ?)`, [idFilme, id, extraInfo]);
                    } else {
                        await conexao.query(`INSERT INTO ${tabela} (filme_id, ${colunaId}) VALUES (?, ?)`, [idFilme, id]);
                    }
                }
            }
        };

        // 4. Inserir as novas listas de IDs
        await inserirRelacao('TBLFIL_PES', 'pessoa_id', elenco, 'Elenco');
        await inserirRelacao('TBLFIL_PES', 'pessoa_id', diretor, 'Diretor');
        await inserirRelacao('TBLFIL_PES', 'pessoa_id', roterista, 'Roterista');
        await inserirRelacao('TBLFIL_GEN', 'genero_id', generos);
        await inserirRelacao('TBLFIL_TAG', 'tag_id', tags);
        await inserirRelacao('TBLFIL_PLA', 'plataforma_id', plataformas);

        await conexao.commit();
        res.json({ mensagem: "Filme atualizado com sucesso!", id: idFilme });
    } catch (error) {
        await conexao.rollback();
        res.status(400).json({ erro: "Erro ao atualizar filme.", detalhe: error.message });
    } finally {
        conexao.release();
    }
});

// ==========================================
// Rota para APAGAR um filme (Apenas Admin)
// ==========================================
router.delete('/:id', verificarAcesso(['admin']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // O 'ON DELETE CASCADE' na base de dados apaga automaticamente os registos nas tabelas de relação
        const [result] = await db.execute('DELETE FROM TBLFIL WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Filme não encontrado para remover." });
        }

        res.json({ mensagem: "Filme removido com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao apagar o filme." });
    }
});

module.exports = router;