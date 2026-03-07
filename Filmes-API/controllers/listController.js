const db = require('../db/db'); // Ajuste o caminho para a sua conexão MySQL

const listController = {
    // 1. Criar uma nova lista
    criarLista: async (req, res) => {
        const { nome, descricao } = req.body;
        const usuarioId = req.usuario.id; // Vem do token validado pelo auth.js

        if (!nome) {
            return res.status(400).json({ erro: "O nome da lista é obrigatório." });
        }

        try {
            // Verifica o limite de 20 listas (Criadas não-padrão + Seguidas)
            const [rows] = await db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM TBLLIST WHERE IDUSER = ? AND PADRAO = FALSE) +
                    (SELECT COUNT(*) FROM TBLLIST_FOLLOW WHERE IDUSER = ?) AS total_listas
            `, [usuarioId, usuarioId]);

            if (rows[0].total_listas >= 20) {
                return res.status(403).json({ erro: "Atingiu o limite máximo de 20 listas (criadas e seguidas)." });
            }

            // Cria a nova lista
            const [resultado] = await db.query(
                `INSERT INTO TBLLIST (IDUSER, nome, descricao, padrao) VALUES (?, ?, ?, FALSE)`,
                [usuarioId, nome, descricao]
            );

            return res.status(201).json({ 
                mensagem: "Lista criada com sucesso!", 
                listaId: resultado.insertId 
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ erro: "Erro ao criar a lista." });
        }
    },

    // 2. Adicionar filme a uma lista
    adicionarFilme: async (req, res) => {
        const { listaId, filmeId } = req.body;
        const usuarioId = req.usuario.id;

        try {
            // Verifica se a lista pertence ao usuário
            const [lista] = await db.query(`SELECT IDUSER FROM TBLLIST WHERE id = ?`, [listaId]);
            
            if (lista.length === 0) {
                return res.status(404).json({ erro: "Lista não encontrada." });
            }
            if (lista[0].IDUSER !== usuarioId) {
                return res.status(403).json({ erro: "Não tem permissão para editar esta lista." });
            }

            // Adiciona o filme (o INSERT IGNORE evita duplicados na mesma lista)
            await db.query(
                `INSERT IGNORE INTO TBLLIST_FIL (IDLIST, IDFIL) VALUES (?, ?)`,
                [listaId, filmeId]
            );

            return res.status(200).json({ mensagem: "Filme adicionado à lista!" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ erro: "Erro ao adicionar filme à lista." });
        }
    },

    // 3. Seguir uma lista de outro utilizador
    seguirLista: async (req, res) => {
        const { listaId } = req.body;
        const usuarioId = req.usuario.id;

        try {
            // Verifica se o usuário está a tentar seguir a própria lista
            const [lista] = await db.query(`SELECT IDUSER FROM TBLLIST WHERE id = ?`, [listaId]);
            if (lista.length > 0 && lista[0].IDUSER === usuarioId) {
                return res.status(400).json({ erro: "Não pode seguir a sua própria lista." });
            }

            // Verifica o limite de 20 listas
            const [rows] = await db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM TBLLIST WHERE IDUSER = ? AND padrao = FALSE) +
                    (SELECT COUNT(*) FROM TBLLIST_FOLLOW WHERE IDUSER = ?) AS total_listas
            `, [usuarioId, usuarioId]);

            if (rows[0].total_listas >= 20) {
                return res.status(403).json({ erro: "Atingiu o limite máximo de 20 listas (criadas e seguidas)." });
            }

            // Adiciona aos seguidores
            await db.query(
                `INSERT IGNORE INTO TBLLIST_FOLLOW (IDLIST, IDUSER) VALUES (?, ?)`,
                [listaId, usuarioId]
            );

            return res.status(200).json({ mensagem: "Passou a seguir esta lista!" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ erro: "Erro ao seguir a lista." });
        }
    },

    // 4. Curtir uma lista
    curtirLista: async (req, res) => {
        const { listaId } = req.body;
        const usuarioId = req.usuario.id;

        try {
            // Diferente de seguir, pode curtir a própria lista se quiser
            await db.query(
                `INSERT IGNORE INTO TBLLIST_LIKE (IDLIST, IDUSER) VALUES (?, ?)`,
                [listaId, usuarioId]
            );

            return res.status(200).json({ mensagem: "Lista curtida!" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ erro: "Erro ao curtir a lista." });
        }
    }
};

module.exports = listController;