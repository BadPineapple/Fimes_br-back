const db = require('../db/db');

const perfilController = {
    obterPerfilCompleto: async (req, res) => {
        try {
            // Assumindo que este ID que vem na rota é o IDLOGIN (ID de autenticação)
            const loginId = parseInt(req.params.id);

            // 1. Buscar os dados básicos do utilizador usando os nomes exatos da sua tabela
            const [usuario] = await db.execute(`
                SELECT 
                    p.IDUSER as id_perfil, 
                    p.NOMUSER as nome, 
                    p.DESC as descricao, 
                    p.FOTPER as foto_perfil, 
                    p.DTANASC as data_nascimento, 
                    l.EMAIL as email, 
                    l.STATS as status
                FROM tbluser p
                INNER JOIN tbllogin l ON p.IDLOGIN = l.IDUSER
                WHERE l.IDUSER = ?
            `, [loginId]);

            if (usuario.length === 0) {
                return res.status(404).json({ erro: "Utilizador não encontrado." });
            }

            const dadosPerfil = usuario[0];
            const idUsuarioReal = dadosPerfil.id_perfil; // O IDUSER da tbluser

            // 2. Buscar as listas criadas por este utilizador (na tabela tbllist)
            const [listas] = await db.execute(`
                SELECT 
                    IDLIST as id, 
                    NOMLIST as nome, 
                    \`DESC\` as descricao, 
                    PADRAO as padrao, 
                    DTACRI as data_criacao
                FROM tbllist 
                WHERE IDUSER = ?
            `, [idUsuarioReal]);

            // 3. Para cada lista, buscar os filmes guardados nela (na tabela tbllist_fil)
            for (let lista of listas) {
                const [filmes] = await db.execute(`
                    SELECT 
                        f.IDFIL as id, 
                        f.NOMFIL as titulo, 
                        f.IMAGEM as imagens, 
                        f.ANO as ano,
                        fl.DTAADC as data_adicao
                    FROM tbllist_fil fl
                    INNER JOIN tblfil f ON fl.IDFIL = f.IDFIL
                    WHERE fl.IDLIST = ?
                    ORDER BY fl.DTAADC DESC
                `, [lista.id]);
                
                // Anexa os filmes diretamente ao objeto da lista
                lista.filmes = filmes;
                lista.total_filmes = filmes.length;
            }

            // Removemos o id_perfil da resposta final pois o frontend não precisa dele
            delete dadosPerfil.id_perfil;

            // 4. Enviar a resposta consolidada para o Frontend
            res.json({
                perfil: dadosPerfil,
                listas: listas
            });

        } catch (error) {
            console.error("Erro ao buscar perfil completo:", error);
            res.status(500).json({ erro: "Erro interno ao carregar o perfil." });
        }
    },
    atualizarPerfil: async (req, res) => {
        try {
            // O ID que vem do token/rota é o IDLOGIN
            const loginId = parseInt(req.params.id);
            const { nome, descricao } = req.body;

            if (!nome || nome.trim() === '') {
                return res.status(400).json({ erro: "O nome não pode estar vazio." });
            }

            // Atualiza a tabela tbluser onde o IDLOGIN for igual ao id da requisição
            // Atenção: A coluna DESC precisa estar entre crases para não dar erro de sintaxe
            const [result] = await db.execute(`
                UPDATE tbluser 
                SET NOMUSER = ?, \`DESC\` = ? 
                WHERE IDLOGIN = ?
            `, [nome, descricao, loginId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ erro: "Perfil não encontrado ou nenhuma alteração realizada." });
            }

            res.json({ mensagem: "Perfil atualizado com sucesso!" });

        } catch (error) {
            console.error("Erro ao atualizar perfil:", error);
            res.status(500).json({ erro: "Erro interno ao atualizar o perfil." });
        }
    }
};

module.exports = perfilController;