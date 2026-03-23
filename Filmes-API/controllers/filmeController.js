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
                query += 'INNER JOIN TBLFIL_GEN fg ON f.IDFIL = fg.IDFIL ';
                conditions.push('fg.IDGEN = ?');
                queryParams.push(genero);
            }
            if (tag) {
                query += 'INNER JOIN TBLFIL_TAG ft ON f.IDFIL = ft.IDFIL ';
                conditions.push('ft.IDTAG = ?');
                queryParams.push(tag);
            }
            if (plataforma) {
                query += 'INNER JOIN TBLFIL_PLA fp ON f.IDFIL = fp.IDFIL ';
                conditions.push('fp.IDPLA = ?');
                queryParams.push(plataforma);
            }
            if (pessoa) {
                query += 'INNER JOIN TBLFIL_PES fpes ON f.IDFIL = fpes.IDFIL ';
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
        const { id } = req.params;
        try {
            // 1. Buscar os dados básicos do filme
            const [filmeRows] = await db.query(
                "SELECT * FROM tblfil WHERE IDFIL = ?", 
                [id]
            );

            if (filmeRows.length === 0) {
                return res.status(404).json({ message: "Filme não encontrado" });
            }

            const filme = filmeRows[0];

            // 2. Buscar Gêneros relacionados
            const [generos] = await db.query(`
                SELECT g.IDGEN, g.NOMGEN 
                FROM tblgen g
                INNER JOIN tblfil_gen fg ON g.IDGEN = fg.IDGEN
                WHERE fg.IDFIL = ?`, [id]);

            // 3. Buscar Pessoas relacionadas (Diretores/Atores)
            const [pessoas] = await db.query(`
                SELECT p.IDPES, p.NOMPES 
                FROM tblpes p
                INNER JOIN tblfil_pes fp ON p.IDPES = fp.IDPES
                WHERE fp.IDFIL = ?`, [id]);

            // 4. Buscar Plataformas (ajuste se tiver tabela de ligação tblfil_pla)
            // Se a sua estrutura atual não tiver ligação, esta parte retorna vazio
            const [plataformas] = await db.query(`
                SELECT pl.IDPLA, pl.NOMPLA 
                FROM tblpla pl
                INNER JOIN tblfil_pla fp ON pl.IDPLA = fp.IDPLA
                WHERE fp.IDFIL = ?`, [id]);

            // Montar o objeto final
            const resultado = {
                ...filme,
                GENEROS: generos,
                DIRETORES: pessoas,
                PLATAFORMAS: plataformas
            };

            res.json(resultado);
        } catch (error) {
            res.status(500).json({ error: error.message });
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
                `INSERT INTO TBLFIL (NOMFIL, SINOPSE, IMAGEM, DURACAO, ANO, IMDBID, NOTEXT) 
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
                query += papel ? ', FUNC) VALUES ' : ') VALUES ';

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
                 SET NOMFIL = ?, SINOPSE = ?, IMAGEM = ?, DURACAO = ?, ANO = ?, IMDBID = ?, NOTEXT = ? 
                 WHERE IDFIL = ?`,
                [
                    baseFilme.titulo, baseFilme.sinopse, baseFilme.imagens, 
                    baseFilme.duracao, baseFilme.ano, baseFilme.tmdb_id, baseFilme.nota_externa, idFilme
                ]
            );

            // 2. Limpa as relações antigas para reescrevê-las
            await conexao.execute('DELETE FROM TBLFIL_PES WHERE IDFIL = ?', [idFilme]);
            await conexao.execute('DELETE FROM TBLFIL_GEN WHERE IDFIL = ?', [idFilme]);
            await conexao.execute('DELETE FROM TBLFIL_TAG WHERE IDFIL = ?', [idFilme]);
            await conexao.execute('DELETE FROM TBLFIL_PLA WHERE IDFIL = ?', [idFilme]);

            // 3. Função Refatorada: Agora aceita um Array de Strings (ex: ["Ação", "Aventura"])
            const processarRelacaoDinamica = async (conexao, idFilme, tabelaMestre, colunaMestre, tabelaRelacao, colunaRelacaoId, arrayItems, cargo = null) => {
                // Se não vier dados ou não for array, sai da função em segurança
                if (!Array.isArray(arrayItems) || arrayItems.length === 0) return;

                const idsParaInserir = [];

                for (const itemNome of arrayItems) {
                    if (!itemNome || typeof itemNome !== 'string') continue;
                    
                    const nomeLimpo = itemNome.trim();
                    if (!nomeLimpo) continue;

                    // A. Verifica se o item já existe no banco
                    const [rows] = await conexao.execute(`SELECT ${colunaRelacaoId} FROM ${tabelaMestre} WHERE ${colunaMestre} = ? LIMIT 1`, [nomeLimpo]);
                    
                    let itemId;

                    if (rows.length > 0) {
                        // O item já existe, pega o ID dele
                        itemId = rows[0][colunaRelacaoId];
                    } else {
                        // B. O item é novo, insere na tabela mestre
                        const [result] = await conexao.execute(`INSERT INTO ${tabelaMestre} (${colunaMestre}) VALUES (?)`, [nomeLimpo]);
                        itemId = result.insertId;
                    }

                    idsParaInserir.push(itemId);
                }

                if (idsParaInserir.length === 0) return;

                // C. Vincula os IDs na tabela de relação (ex: Filme X Gênero)
                // Ajustado para usar 'CARGO' em vez de 'papel', conforme o seu banco e front-end
                let query = `INSERT IGNORE INTO ${tabelaRelacao} (IDFIL, ${colunaRelacaoId}`;
                query += cargo ? ', FUNC) VALUES ' : ') VALUES ';

                const values = [];
                const placeholders = idsParaInserir.map(id => {
                    if (cargo) {
                        values.push(idFilme, id, cargo);
                        return '(?, ?, ?)';
                    }
                    values.push(idFilme, id);
                    return '(?, ?)';
                }).join(', ');

                await conexao.execute(query + placeholders, values);
            };

            // 4. Executa o processamento dinâmico
            await processarRelacaoDinamica(conexao, idFilme, 'TBLPES', 'NOMPES', 'TBLFIL_PES', 'IDPES', elenco, 'Ator');
            await processarRelacaoDinamica(conexao, idFilme, 'TBLPES', 'NOMPES', 'TBLFIL_PES', 'IDPES', diretor, 'Diretor');
            await processarRelacaoDinamica(conexao, idFilme, 'TBLPES', 'NOMPES', 'TBLFIL_PES', 'IDPES', roterista, 'Roteirista');
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