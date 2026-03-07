const db = require('../db/db'); // Ajustar o caminho para a conexão com o MySQL

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

const filmeController = {
    listarTodos: async (req, res) => {
        try {
            // Recebe os parâmetros de filtro da URL (ex: ?titulo=Ação&genero=2)
            const { titulo, genero, tag, plataforma, pessoa } = req.query;

            // Base da query usando DISTINCT para evitar filmes duplicados pelos JOINs
            let query = 'SELECT DISTINCT f.* FROM TBLFIL f ';
            const queryParams = [];
            const conditions = [];

            // 1. Adicionar JOINs dinâmicos e condições exatas de ID
            if (genero) {
                query += 'INNER JOIN TBLFIL_GEN fg ON f.IDGEN = fg.IDFIL ';
                conditions.push('fg.IDGEN = ?');
                queryParams.push(genero);
            }
            if (tag) {
                query += 'INNER JOIN TBLFIL_TAG ft ON f.IDTAG = ft.IDFIL ';
                conditions.push('ft.IDTAG = ?');
                queryParams.push(tag);
            }
            if (plataforma) {
                query += 'INNER JOIN TBLFIL_PLA fp ON f.IDPLA = fp.IDFIL ';
                conditions.push('fp.IDPLA = ?');
                queryParams.push(plataforma);
            }
            if (pessoa) {
                query += 'INNER JOIN TBLFIL_PES fpes ON f.IDPES = fpes.IDFIL ';
                conditions.push('fpes.IDPES = ?');
                queryParams.push(pessoa);
            }

            // 2. Condição de busca parcial para o Título (LIKE)
            if (titulo) {
                conditions.push('f.NOMFIL LIKE ?');
                queryParams.push(`%${titulo}%`);
            }

            // 3. Montar a cláusula WHERE final, se houver filtros
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            // Ordenação padrão para manter a lista organizada
            query += ' ORDER BY f.NOMFIL ASC';

            const [filmes] = await db.execute(query, queryParams);
            
            res.json(filmes);
        } catch (error) {
            console.error("Erro na filtragem de filmes:", error);
            res.status(500).json({ erro: "Erro ao buscar filmes no banco de dados." });
        }
    },

    buscarPorId: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const [filmes] = await db.execute('SELECT * FROM TBLFIL WHERE IDFIL = ?', [id]);

            if (filmes.length === 0) {
                return res.status(404).json({ erro: "Filme não encontrado." });
            }

            res.json(filmes[0]);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar filme.", detalhe: error.message });
        }
    },

    criar: async (req, res) => {
        const conexao = await db.getConnection();
        try {
            await conexao.beginTransaction();

            const { 
                elenco = [], 
                diretor = [], 
                roterista = [], 
                generos = [], 
                tags = [], 
                plataformas = [] 
            } = req.body;

            const baseFilme = extrairDadosBaseFilme(req.body);

            const [resultFilme] = await conexao.execute(
                `INSERT INTO TBLFIL (NOMFIL, SINOPSE, IMAGENS, DURACAO, ANO, IMDBID, NOTEXT) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    baseFilme.titulo, baseFilme.sinopse, baseFilme.imagens, 
                    baseFilme.duracao, baseFilme.ano, baseFilme.tmdb_id, baseFilme.nota_externa
                ]
            );

            const idFilme = resultFilme.insertId;

            // Nova função para processar itens mistos (IDs existentes e textos novos)
            const processarRelacaoDinamica = async (conexao, idFilme, tabelaMestre, colunaMestre, tabelaRelacao, colunaRelacaoId, arrayItems, papel = null) => {
                if (!Array.isArray(arrayItems) || arrayItems.length === 0) return;

                const idsParaInserir = [];

                for (const item of arrayItems) {
                    if (item.novo) {
                        // 1. Se é novo, insere na tabela mestre primeiro (ex: TBLPESSOA, TBLGENERO)
                        const [result] = await conexao.execute(
                            `INSERT INTO ${tabelaMestre} (${colunaMestre}) VALUES (?)`,
                            [item.nome]
                        );
                        // Guarda o ID que o MySQL acabou de gerar
                        idsParaInserir.push(result.insertId);
                    } else if (item.id) {
                        // 2. Se já existe, apenas guarda o ID
                        idsParaInserir.push(item.id);
                    }
                }

                if (idsParaInserir.length === 0) return;

                // 3. Insere na tabela de relação (ex: TBLFIL_PES)
                let query = `INSERT IGNORE INTO ${tabelaRelacao} (IDFIL, ${colunaRelacaoId}`;
                query += papel ? ', papel) VALUES ' : ') VALUES ';

                const values = [];
                const placeholders = idsParaInserir.map(id => {
                    if (papel) {
                        values.push(idFilme, id, papel);
                        return '(?, ?, ?)';
                    }
                    values.push(idFilme, id);
                    return '(?, ?)';
                }).join(', ');

                await conexao.execute(query + placeholders, values);
            };

            // Chamadas dinâmicas. Nota: Ajuste os nomes das tabelas (ex: TBLGENERO) e colunas (ex: 'genero' ou 'nome') se forem diferentes no seu MySQL.
            await processarRelacaoDinamica(conexao, idFilme, 'TBLPES', 'NOMPES', 'TBLFIL_PES', 'IDPES', elenco, 'Elenco');
            await processarRelacaoDinamica(conexao, idFilme, 'TBLPES', 'NOMPES', 'TBLFIL_PES', 'IDPES', diretor, 'Diretor');
            await processarRelacaoDinamica(conexao, idFilme, 'TBLPES', 'NOMPES', 'TBLFIL_PES', 'IDPES', roterista, 'Roterista');
            await processarRelacaoDinamica(conexao, idFilme, 'TBLGEN', 'NOMGEN', 'TBLFIL_GEN', 'IDGEN', generos);
            await processarRelacaoDinamica(conexao, idFilme, 'TBLTAG', 'NOMTAG', 'TBLFIL_TAG', 'IDTAG', tags);
            await processarRelacaoDinamica(conexao, idFilme, 'TBLPLA', 'NOMPLA', 'TBLFIL_PLA', 'IDPLA', plataformas);

            await conexao.commit();
            res.status(201).json({ mensagem: "Filme inserido com sucesso!", id: idFilme });

        } catch (error) {
            await conexao.rollback();
            res.status(400).json({ erro: "Erro ao inserir filme.", detalhe: error.message });
        } finally {
            conexao.release();
        }
    },

    atualizar: async (req, res) => {
        const conexao = await db.getConnection();
        try {
            await conexao.beginTransaction();

            const idFilme = parseInt(req.params.id);
            const { 
                elenco = [], 
                diretor = [], 
                roterista = [], 
                generos = [], 
                tags = [], 
                plataformas = [] 
            } = req.body;

            const baseFilme = extrairDadosBaseFilme(req.body);

            await conexao.execute(
                `UPDATE TBLFIL 
                 SET NOMFIL = ?, SINOPSE = ?, IMAGENS = ?, DURACAO = ?, ANO = ?, IMDBID = ?, NOTEXT = ? 
                 WHERE IDFIL = ?`,
                [
                    baseFilme.titulo, baseFilme.sinopse, baseFilme.imagens, 
                    baseFilme.duracao, baseFilme.ano, baseFilme.tmdb_id, baseFilme.nota_externa, idFilme
                ]
            );

            await conexao.execute('DELETE FROM TBLFIL_PES WHERE IDFIL = ?', [idFilme]);
            await conexao.execute('DELETE FROM TBLFIL_GEN WHERE IDFIL = ?', [idFilme]);
            await conexao.execute('DELETE FROM TBLFIL_TAG WHERE IDFIL = ?', [idFilme]);
            await conexao.execute('DELETE FROM TBLFIL_PLA WHERE IDFIL = ?', [idFilme]);

            // Nova função para processar itens mistos (IDs existentes e textos novos)
            const processarRelacaoDinamica = async (conexao, idFilme, tabelaMestre, colunaMestre, tabelaRelacao, colunaRelacaoId, arrayItems, papel = null) => {
                if (!Array.isArray(arrayItems) || arrayItems.length === 0) return;

                const idsParaInserir = [];

                for (const item of arrayItems) {
                    if (item.novo) {
                        // 1. Se é novo, insere na tabela mestre primeiro (ex: TBLPESSOA, TBLGENERO)
                        const [result] = await conexao.execute(
                            `INSERT INTO ${tabelaMestre} (${colunaMestre}) VALUES (?)`,
                            [item.nome]
                        );
                        // Guarda o ID que o MySQL acabou de gerar
                        idsParaInserir.push(result.insertId);
                    } else if (item.id) {
                        // 2. Se já existe, apenas guarda o ID
                        idsParaInserir.push(item.id);
                    }
                }

                if (idsParaInserir.length === 0) return;

                // 3. Insere na tabela de relação (ex: TBLFIL_PES)
                let query = `INSERT IGNORE INTO ${tabelaRelacao} (IDFIL, ${colunaRelacaoId}`;
                query += papel ? ', papel) VALUES ' : ') VALUES ';

                const values = [];
                const placeholders = idsParaInserir.map(id => {
                    if (papel) {
                        values.push(idFilme, id, papel);
                        return '(?, ?, ?)';
                    }
                    values.push(idFilme, id);
                    return '(?, ?)';
                }).join(', ');

                await conexao.execute(query + placeholders, values);
            };

            // Chamadas dinâmicas. Nota: Ajuste os nomes das tabelas (ex: TBLGENERO) e colunas (ex: 'genero' ou 'nome') se forem diferentes no seu MySQL.
            await processarRelacaoDinamica(conexao, idFilme, 'TBLPES', 'NOMPES', 'TBLFIL_PES', 'IDPES', elenco, 'Elenco');
            await processarRelacaoDinamica(conexao, idFilme, 'TBLPES', 'NOMPES', 'TBLFIL_PES', 'IDPES', diretor, 'Diretor');
            await processarRelacaoDinamica(conexao, idFilme, 'TBLPES', 'NOMPES', 'TBLFIL_PES', 'IDPES', roterista, 'Roterista');
            await processarRelacaoDinamica(conexao, idFilme, 'TBLGEN', 'NOMGEN', 'TBLFIL_GEN', 'IDGEN', generos);
            await processarRelacaoDinamica(conexao, idFilme, 'TBLTAG', 'NOMTAG', 'TBLFIL_TAG', 'IDTAG', tags);
            await processarRelacaoDinamica(conexao, idFilme, 'TBLPLA', 'NOMPLA', 'TBLFIL_PLA', 'IDPLA', plataformas);

            await conexao.commit();
            res.json({ mensagem: "Filme atualizado com sucesso!", id: idFilme });
        } catch (error) {
            await conexao.rollback();
            res.status(400).json({ erro: "Erro ao atualizar filme.", detalhe: error.message });
        } finally {
            conexao.release();
        }
    },

    apagar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);

            const [result] = await db.execute('DELETE FROM TBLFIL WHERE IDFIL = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ erro: "Filme não encontrado." });
            }

            res.json({ mensagem: `Filme removido com sucesso!` });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao apagar filme.", detalhe: error.message });
        }
    }
};

module.exports = filmeController;