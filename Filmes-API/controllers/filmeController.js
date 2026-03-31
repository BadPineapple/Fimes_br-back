const db = require('../db/db'); // Ajustar o caminho para a conexão com o MySQL

// Função auxiliar para extrair apenas os dados da tabela principal do filme
const extrairDadosBaseFilme = (dados) => {
    return {
        titulo:  String(dados.titulo  || '').trim(),
        sinopse: String(dados.sinopse || '').trim(),
        idImagem: dados.idImagem ? Number(dados.idImagem) : null, 
        duracao: String(dados.duracao || '').trim(),
        ano: Number(dados.ano) || null,
        tmdb_id: dados.tmdb_id ? Number(dados.tmdb_id) : null,
        nota_externa: dados.nota_externa ? parseFloat(dados.nota_externa) : null
    };
};

const filmeController = {
    listarTodos: async (req, res) => {
        try {
            const { titulo, genero, tag, plataforma, pessoa, ano, ordenarPor } = req.query;

            // 1. Iniciamos a Query com as colunas necessárias
            // Usamos GROUP_CONCAT para agrupar os nomes dos géneros numa string separada por vírgulas
            let query = `
                SELECT 
                    f.*, 
                    i.LOCAL AS CAMINHO_IMAGEM, 
                    i.IDIMG AS ID_IMAGEM,
                    GROUP_CONCAT(DISTINCT g.NOMGEN) AS LISTA_GENEROS
                FROM TBLFIL f
                LEFT JOIN TBLIMAGEM i ON f.IMAGEM = i.IDIMG
                LEFT JOIN TBLFIL_GEN fg ON f.IDFIL = fg.IDFIL
                LEFT JOIN TBLGEN g ON fg.IDGEN = g.IDGEN
            `;
            
            const queryParams = [];
            const conditions = [];

            // 2. Filtros de Relacionamento (Mantendo a sua lógica de JOINs extras se necessário)
            if (genero) {
                // Se já filtramos por género lá em cima, este JOIN pode ser redundante, 
                // mas mantemos para garantir que o filtro IDGEN funcione
                conditions.push('f.IDFIL IN (SELECT IDFIL FROM TBLFIL_GEN WHERE IDGEN = ?)');
                queryParams.push(genero);
            }
            if (tag) {
                conditions.push('f.IDFIL IN (SELECT IDFIL FROM TBLFIL_TAG WHERE IDTAG = ?)');
                queryParams.push(tag);
            }
            if (plataforma) {
                conditions.push('f.IDFIL IN (SELECT IDFIL FROM TBLFIL_PLA WHERE IDPLA = ?)');
                queryParams.push(plataforma);
            }
            if (pessoa) {
                conditions.push('f.IDFIL IN (SELECT IDFIL FROM TBLFIL_PES WHERE IDPES = ?)');
                queryParams.push(pessoa);
            }

            // 3. Filtros de Atributos
            if (titulo) {
                conditions.push('f.NOMFIL LIKE ?');
                queryParams.push(`%${titulo}%`);
            }
            if (ano) {
                conditions.push('f.ANO = ?');
                queryParams.push(ano);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            // 4. Agrupamento necessário por causa do GROUP_CONCAT e JOINs
            query += ' GROUP BY f.IDFIL, i.IDIMG';

            // 5. Ordenação
            let orderClause = ' ORDER BY f.NOMFIL ASC';
            if (ordenarPor === 'nome_desc') orderClause = ' ORDER BY f.NOMFIL DESC';
            if (ordenarPor === 'nota_desc') orderClause = ' ORDER BY f.NOTEXT DESC';
            if (ordenarPor === 'nota_asc') orderClause = ' ORDER BY f.NOTEXT ASC';
            if (ordenarPor === 'ano_desc') orderClause = ' ORDER BY f.ANO DESC';
            if (ordenarPor === 'ano_asc') orderClause = ' ORDER BY f.ANO ASC';

            query += orderClause;

            const [rows] = await db.execute(query, queryParams);

            // 6. Formatação para o Frontend (O "Pulo do Gato")
            // Transformamos os dados planos do SQL no formato de objeto/array que o FilmCard espera
            const filmesFormatados = rows.map(row => ({
                ...row,
                // Transforma o caminho da imagem no array IMAGEM
                IMAGEM: row.CAMINHO_IMAGEM ? [{ IDIMG: row.ID_IMAGEM, LOCAL: row.CAMINHO_IMAGEM }] : [],
                // Passa a string de géneros (o FilmCard já sabe dar split nela)
                GENEROS: row.LISTA_GENEROS || ""
            }));

            res.json(filmesFormatados);

        } catch (error) {
            console.error("Erro na filtragem:", error);
            res.status(500).json({ erro: "Erro ao buscar filmes." });
        }
    },

    buscarPessoas: async (req, res) => {
        try {
            const { busca } = req.query;
            if (!busca) return res.json([]);
            
            const [pessoas] = await db.execute(
                'SELECT IDPES, NOMPES FROM TBLPES WHERE NOMPES LIKE ? LIMIT 10',
                [`%${busca}%`]
            );
            res.json(pessoas);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar pessoas." });
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

            // 4. Buscar Plataformas
            const [plataformas] = await db.query(`
                SELECT pl.IDPLA, pl.NOMPLA 
                FROM tblpla pl
                INNER JOIN tblfil_pla fp ON pl.IDPLA = fp.IDPLA
                WHERE fp.IDFIL = ?`, [id]);

            // 5. Buscar Imagem do filme
            const [imagens] = await db.query(`
                SELECT i.IDIMG, i.LOCAL 
                FROM tblimagem i
                INNER JOIN tblfil f ON i.IDIMG = f.IMAGEM
                WHERE f.IDFIL = ?`, [id]);

            // Montar o objeto final
            const resultado = {
                ...filme,
                GENEROS: generos,
                DIRETORES: pessoas,
                PLATAFORMAS: plataformas,
                IMAGEM: imagens
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
                `INSERT INTO TBLFIL (NOMFIL, SINOPSE, IMAGEM, DURACAO, ANO, NOTEXT, NOTEXT) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    baseFilme.titulo, baseFilme.sinopse, baseFilme.idImagem, 
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
                 SET NOMFIL = ?, SINOPSE = ?, IMAGEM = ?, DURACAO = ?, ANO = ?, NOTEXT = ?, NOTEXT = ? 
                 WHERE IDFIL = ?`,
                [
                    baseFilme.titulo, baseFilme.sinopse, baseFilme.idImagem, 
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