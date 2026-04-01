const db = require('../db/db'); // Ajustar caminho conforme necessário

const pessoasController = {
    listar: async (req, res) => {
        try {
            // Ajuste TBLFIL e TBLFILPES para os nomes reais das suas tabelas de filmes e de ligação
            const query = `
                SELECT 
                    p.IDPES, p.NOMPES, p.CARGO, p.DTANASC, p.DTAFAL, p.NATU, p.BIO,
                    f.NOMFIL, f.ANO, fp.PPL
                FROM TBLPES p
                LEFT JOIN TBLFIL_PES fp ON p.IDPES = fp.IDPES
                LEFT JOIN TBLFIL f ON fp.IDFIL = f.IDFIL
                ORDER BY p.NOMPES ASC, f.ANO DESC
            `;
            
            const [linhas] = await db.execute(query);

            // Agrupar os resultados para criar o array de filmografia para cada pessoa
            const pessoasMap = new Map();

            linhas.forEach(row => {
                // Se a pessoa ainda não estiver no Map, adicionamos
                if (!pessoasMap.has(row.IDPES)) {
                    pessoasMap.set(row.IDPES, {
                        id: row.IDPES.toString(), // O React router geralmente usa strings para IDs na URL
                        nome: row.NOMPES,
                        tipo: row.CARGO,
                        nascimento: row.DTANASC,
                        falecimento: row.DTAFAL,
                        naturalidade: row.NATU,
                        biografia: row.BIO,
                        filmografia: []
                    });
                }

                // Se houver um título de filme associado nesta linha, adicionamos ao array
                if (row.NOMFIL) {
                    pessoasMap.get(row.IDPES).filmografia.push({
                        titulo: row.NOMFIL,
                        papel: row.PPL,
                        ano: row.ANO
                    });
                }
            });

            // Converter o Map de volta para um array para enviar como JSON
            const resultado = Array.from(pessoasMap.values());

            res.json(resultado);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar pessoas.", detalhe: error.message });
        }
    },

    // 2. Buscar uma pessoa específica por ID (Útil para a tela ArtistaDetalhe)
    buscarPorId: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            
            const query = `
                SELECT 
                    p.IDPES, p.NOMPES, p.CARGO, p.DTANASC, p.DTAFAL, p.NATU, p.BIO,
                    f.NOMFIL, f.ANO, fp.PPL
                FROM TBLPES p
                LEFT JOIN TBLFIL_PES fp ON p.IDPES = fp.IDPES
                LEFT JOIN TBLFIL f ON fp.IDFIL = f.IDFIL
                WHERE p.IDPES = ?
                ORDER BY f.ANO DESC
            `;
            
            const [linhas] = await db.execute(query, [id]);
            
            if (linhas.length === 0) return res.status(404).json({ erro: "Pessoa não encontrada." });

            // Montar o objeto principal da pessoa
            const pessoa = {
                id: linhas[0].IDPES.toString(),
                nome: linhas[0].NOMPES,
                tipo: linhas[0].CARGO,
                nascimento: linhas[0].DTANASC,
                falecimento: linhas[0].DTAFAL,
                naturalidade: linhas[0].NATU,
                biografia: linhas[0].BIO,
                filmografia: []
            };

            // Preencher a filmografia (ignorando caso a pessoa não tenha nenhum filme)
            linhas.forEach(row => {
                if (row.NOMFIL) {
                    pessoa.filmografia.push({
                        titulo: row.NOMFIL,
                        papel: row.PPL,
                        ano: row.ANO
                    });
                }
            });

            res.json(pessoa);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar pessoa.", detalhe: error.message });
        }
    },

    // 3. Criar uma nova pessoa com todos os dados
    criar: async (req, res) => {
        try {
            const { nompes, cargo, DTANASC, DTAFAL, NATU, BIO } = req.body;
            
            if (!nompes) return res.status(400).json({ erro: "O nome da pessoa (nompes) é obrigatório." });

            const query = `
                INSERT INTO TBLPES (NOMPES, CARGO, DTANASC, DTAFAL, NATU, BIO) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            // Variáveis enviadas para a query. Se não vierem no body, insere como NULL
            const valores = [
                nompes, 
                cargo || null, 
                DTANASC || null, 
                DTAFAL || null, 
                NATU || null, 
                BIO || null
            ];

            const [result] = await db.execute(query, valores);
            res.status(201).json({ mensagem: "Pessoa adicionada com sucesso!", id: result.insertId, nompes });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao adicionar pessoa.", detalhe: error.message });
        }
    },

    atualizar: async (req, res) => {
        let conn;
        try {
            const id = parseInt(req.params.id);
            
            const { nompes, cargo, nascimento, falecimento, naturalidade, biografia, filmografia } = req.body;
            
            if (!nompes) return res.status(400).json({ erro: "O nome da pessoa (nompes) é obrigatório." });

            // Pega uma conexão dedicada para iniciar a transação
            conn = await db.getConnection();
            await conn.beginTransaction();

            // 2. Atualizar dados principais na TBLPES (usando os nomes reais das colunas no SQL)
            const queryPessoa = `
                UPDATE TBLPES 
                SET NOMPES = ?, CARGO = ?, DTANASC = ?, DTAFAL = ?, NATU = ?, BIO = ? 
                WHERE IDPES = ?
            `;
            
            // Aqui fazemos a ponte: a variável 'nascimento' do React vai para a coluna 'DTANASC', etc.
            const valoresPessoa = [
                nompes, 
                cargo || null, 
                nascimento || null, 
                falecimento || null, 
                naturalidade || null, 
                biografia || null, 
                id
            ];

            const [resultPessoa] = await conn.execute(queryPessoa, valoresPessoa);
            
            if (resultPessoa.affectedRows === 0) {
                await conn.rollback(); // Cancela a transação
                conn.release();
                return res.status(404).json({ erro: "Pessoa não encontrada." });
            }

            // 3. Atualizar a filmografia (TBLFIL_PES)
            // Só faz isso se 'filmografia' for enviada como um array na requisição
            if (Array.isArray(filmografia)) {
                
                // Passo A: Remove todos os filmes atuais desse artista
                await conn.execute('DELETE FROM TBLFIL_PES WHERE IDPES = ?', [id]);

                // Passo B: Insere a nova lista de filmes
                if (filmografia.length > 0) {
                    // Coluna PPL em vez de papel
                    const queryFilme = 'INSERT INTO TBLFIL_PES (IDFIL, IDPES, PPL) VALUES (?, ?, ?)';
                    
                    for (const filme of filmografia) {
                        // O React envia 'filme.papel', e nós inserimos na coluna 'PPL'
                        await conn.execute(queryFilme, [filme.idfil, id, filme.papel || null]);
                    }
                }
            }

            // Se tudo deu certo, confirma as alterações no banco de dados
            await conn.commit();
            conn.release();

            res.json({ mensagem: "Pessoa e filmografia atualizadas com sucesso!" });

        } catch (error) {
            // Se der qualquer erro, desfaz tudo que foi feito (Rollback)
            if (conn) {
                await conn.rollback();
                conn.release();
            }
            res.status(500).json({ erro: "Erro ao atualizar pessoa e filmografia.", detalhe: error.message });
        }
    },

    // 5. Apagar uma pessoa
    apagar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const [result] = await db.execute('DELETE FROM TBLPES WHERE IDPES = ?', [id]);
            
            if (result.affectedRows === 0) return res.status(404).json({ erro: "Pessoa não encontrada." });
            res.json({ mensagem: "Pessoa removida com sucesso!" });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao apagar pessoa.", detalhe: error.message });
        }
    }
};

module.exports = pessoasController;