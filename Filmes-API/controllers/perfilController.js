const db = require('../db/db');

const perfilController = {
    obterPerfilCompleto: async (req, res) => {
        try {
            const loginId = parseInt(req.params.id);

            // 1. Buscar os dados básicos (COM JOIN PARA A FOTO DE PERFIL)
            const [usuario] = await db.execute(`
                SELECT 
                    p.IDUSER as id_perfil, 
                    p.NOMUSER as nome, 
                    p.DESC as descricao,
                    i.LOCAL as foto_perfil, -- Traz a URL da imagem do repositório
                    p.DTANASC as data_nascimento, 
                    l.EMAIL as email, 
                    l.STATS as status
                FROM tbluser p
                INNER JOIN tbllogin l ON p.IDLOGIN = l.IDLOGIN
                LEFT JOIN tblimagem i ON p.FOTPER = i.IDIMG -- LIGAÇÃO COM A TABELA DE IMAGENS
                WHERE l.IDLOGIN = ?
            `, [loginId]);

            if (usuario.length === 0) {
                return res.status(404).json({ erro: "Utilizador não encontrado." });
            }

            const dadosPerfil = usuario[0];
            const idUsuarioReal = dadosPerfil.id_perfil;

            // 2. Buscar as listas criadas por este utilizador
            const [listas] = await db.execute(`
                SELECT 
                    l.IDLIST as id, 
                    l.NOMLIST as nome, 
                    l.DESC as descricao,
                    l.PADRAO as padrao, 
                    l.DTACRI as data_criacao
                FROM tbllist l
                WHERE IDUSER = ?
            `, [idUsuarioReal]);

            // 3. Buscar os filmes de cada lista (COM JOIN PARA A CAPA DO FILME)
            for (let lista of listas) {
                const [filmes] = await db.execute(`
                    SELECT 
                        f.IDFIL as id, 
                        f.NOMFIL as titulo, 
                        img.LOCAL as imagem, 
                        f.ANO as ano,
                        fl.DTAADC as data_adicao
                    FROM tbllist_fil fl
                    INNER JOIN tblfil f ON fl.IDFIL = f.IDFIL
                    LEFT JOIN tblimagem img ON f.IMAGEM = img.IDIMG
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
            const loginId = parseInt(req.params.id);
            const { nome, descricao, foto_perfil } = req.body; // Agora recebe a foto

            if (!nome || nome.trim() === '') {
                return res.status(400).json({ erro: "O nome não pode estar vazio." });
            }

            // Se o frontend enviar uma foto nova, atualiza a FOTPER também.
            // Caso contrário, atualiza só o nome e a descrição.
            if (foto_perfil) {
                const [result] = await db.execute(`
                    UPDATE tbluser 
                    SET NOMUSER = ?, DESC = ?, FOTPER = ? 
                    WHERE IDLOGIN = ?
                `, [nome, descricao, foto_perfil, loginId]);
            } else {
                const [result] = await db.execute(`
                    UPDATE tbluser 
                    SET NOMUSER = ?, DESC = ? 
                    WHERE IDLOGIN = ?
                `, [nome, descricao, loginId]);
            }

            res.json({ mensagem: "Perfil atualizado com sucesso!" });

        } catch (error) {
            console.error("Erro ao atualizar perfil:", error);
            res.status(500).json({ erro: "Erro ao atualizar perfil." });
        }
    }
};

module.exports = perfilController;