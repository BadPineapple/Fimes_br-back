const db = require('../db/db'); // Ajustar caminho conforme necessário

const opcoesController = {
    listarGeneros: async (req, res) => {
        try {
            const [linhas] = await db.execute('SELECT IDGEN, NOMGEN FROM TBLGEN ORDER BY NOMGEN ASC');
            res.json(linhas);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar generos." });
        }
    },

    listarTags: async (req, res) => {
        try {
            const [linhas] = await db.execute('SELECT IDTAG, NOMTAG FROM TBLTAG ORDER BY NOMTAG ASC');
            res.json(linhas);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar tags." });
        }
    },

    listarPlataformas: async (req, res) => {
        try {
            // Adicionado o campo 'link' no SELECT
            const [linhas] = await db.execute('SELECT IDPLA, NOMPLA, LINK FROM TBLPLA ORDER BY NOMPLA ASC');
            res.json(linhas);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar plataformas." });
        }
    },

    listarPessoas: async (req, res) => {
        try {
            // Serve para listar diretores, atores e roteiristas na mesma caixa de seleção
            const [linhas] = await db.execute('SELECT IDPES, NOMPES FROM TBLPES ORDER BY NOMPES ASC');
            res.json(linhas);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar pessoas." });
        }
    },

    criarGenero: async (req, res) => {
        try {
            const { nome } = req.body; // No corpo da requisição enviamos { "nome": "Ação" }
            if (!nome) return res.status(400).json({ erro: "O nome do género é obrigatório." });

            const [result] = await db.execute('INSERT INTO TBLGEN (genero) VALUES (?)', [nome]);
            res.status(201).json({ mensagem: "Género criado com sucesso!", id: result.insertId, nome });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao criar género.", detalhe: error.message });
        }
    },

    criarTag: async (req, res) => {
        try {
            const { nome } = req.body;
            if (!nome) return res.status(400).json({ erro: "O nome da tag é obrigatório." });

            const [result] = await db.execute('INSERT INTO TBLTAG (nome) VALUES (?)', [nome]);
            res.status(201).json({ mensagem: "Tag criada com sucesso!", id: result.insertId, nome });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao criar tag.", detalhe: error.message });
        }
    },

    criarPlataforma: async (req, res) => {
        try {
            const { nome, link } = req.body; // Receber também o link
            if (!nome) return res.status(400).json({ erro: "O nome da plataforma é obrigatório." });

            // Inserir o nome e o link (permitindo que o link seja nulo caso não seja enviado)
            const [result] = await db.execute(
                'INSERT INTO TBLPLA (nome, link) VALUES (?, ?)', 
                [nome, link || null]
            );
            res.status(201).json({ mensagem: "Plataforma criada com sucesso!", id: result.insertId, nome, link });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao criar plataforma.", detalhe: error.message });
        }
    },

    criarPessoa: async (req, res) => {
        try {
            const { nome } = req.body;
            if (!nome) return res.status(400).json({ erro: "O nome da pessoa é obrigatório." });

            const [result] = await db.execute('INSERT INTO TBLPES (nome) VALUES (?)', [nome]);
            res.status(201).json({ mensagem: "Pessoa adicionada com sucesso!", id: result.insertId, nome });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao adicionar pessoa.", detalhe: error.message });
        }
    },

    buscarGeneroPorId: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const [linhas] = await db.execute('SELECT id, genero FROM TBLGEN WHERE id = ?', [id]);
            
            if (linhas.length === 0) return res.status(404).json({ erro: "Género não encontrado." });
            res.json(linhas[0]);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar género.", detalhe: error.message });
        }
    },

    buscarTagPorId: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const [linhas] = await db.execute('SELECT id, nome FROM TBLTAG WHERE id = ?', [id]);
            
            if (linhas.length === 0) return res.status(404).json({ erro: "Tag não encontrada." });
            res.json(linhas[0]);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar tag.", detalhe: error.message });
        }
    },

    buscarPlataformaPorId: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const [linhas] = await db.execute('SELECT id, nome, link FROM TBLPLA WHERE id = ?', [id]);
            
            if (linhas.length === 0) return res.status(404).json({ erro: "Plataforma não encontrada." });
            res.json(linhas[0]);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar plataforma.", detalhe: error.message });
        }
    },

    buscarPessoaPorId: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const [linhas] = await db.execute('SELECT id, nome FROM TBLPES WHERE id = ?', [id]);
            
            if (linhas.length === 0) return res.status(404).json({ erro: "Pessoa não encontrada." });
            res.json(linhas[0]);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar pessoa.", detalhe: error.message });
        }
    },

    atualizarGenero: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { nome } = req.body;
            if (!nome) return res.status(400).json({ erro: "O nome do género é obrigatório." });

            const [result] = await db.execute('UPDATE TBLGEN SET genero = ? WHERE id = ?', [nome, id]);
            if (result.affectedRows === 0) return res.status(404).json({ erro: "Género não encontrado." });
            
            res.json({ mensagem: "Género atualizado com sucesso!" });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao atualizar género.", detalhe: error.message });
        }
    },

    atualizarTag: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { nome } = req.body;
            if (!nome) return res.status(400).json({ erro: "O nome da tag é obrigatório." });

            const [result] = await db.execute('UPDATE TBLTAG SET nome = ? WHERE id = ?', [nome, id]);
            if (result.affectedRows === 0) return res.status(404).json({ erro: "Tag não encontrada." });

            res.json({ mensagem: "Tag atualizada com sucesso!" });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao atualizar tag.", detalhe: error.message });
        }
    },

    atualizarPlataforma: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { nome, link } = req.body; // Inclui o campo link
            if (!nome) return res.status(400).json({ erro: "O nome da plataforma é obrigatório." });

            const [result] = await db.execute(
                'UPDATE TBLPLA SET nome = ?, link = ? WHERE id = ?', 
                [nome, link || null, id]
            );
            if (result.affectedRows === 0) return res.status(404).json({ erro: "Plataforma não encontrada." });

            res.json({ mensagem: "Plataforma atualizada com sucesso!" });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao atualizar plataforma.", detalhe: error.message });
        }
    },

    atualizarPessoa: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { nome } = req.body;
            if (!nome) return res.status(400).json({ erro: "O nome da pessoa é obrigatório." });

            const [result] = await db.execute('UPDATE TBLPES SET nome = ? WHERE id = ?', [nome, id]);
            if (result.affectedRows === 0) return res.status(404).json({ erro: "Pessoa não encontrada." });

            res.json({ mensagem: "Pessoa atualizada com sucesso!" });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao atualizar pessoa.", detalhe: error.message });
        }
    },

    apagarGenero: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const [result] = await db.execute('DELETE FROM TBLGEN WHERE id = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ erro: "Género não encontrado." });
            res.json({ mensagem: "Género removido com sucesso!" });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao apagar género.", detalhe: error.message });
        }
    },

    apagarTag: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const [result] = await db.execute('DELETE FROM TBLTAG WHERE id = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ erro: "Tag não encontrada." });
            res.json({ mensagem: "Tag removida com sucesso!" });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao apagar tag.", detalhe: error.message });
        }
    },

    apagarPlataforma: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const [result] = await db.execute('DELETE FROM TBLPLA WHERE id = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ erro: "Plataforma não encontrada." });
            res.json({ mensagem: "Plataforma removida com sucesso!" });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao apagar plataforma.", detalhe: error.message });
        }
    },

    apagarPessoa: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const [result] = await db.execute('DELETE FROM TBLPES WHERE id = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ erro: "Pessoa não encontrada." });
            res.json({ mensagem: "Pessoa removida com sucesso!" });
        } catch (error) {
            res.status(500).json({ erro: "Erro ao apagar pessoa.", detalhe: error.message });
        }
    }
};

module.exports = opcoesController;