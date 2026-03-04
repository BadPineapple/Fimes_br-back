// Importações base (mantenha as que já tinha no login.js)
const db = require('../db/db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'uma_chave_secreta_muito_longa_e_segura';

// Novo formato: Objeto com métodos
const loginController = {
    listarUsuarios: async (req, res) => {
         try {
        const [usuarios] = await db.execute(`
            SELECT l.id, p.nome, l.email, l.telefone, p.data_nascimento, p.apoiador, p.aceita_propaganda, GROUP_CONCAT(r.nome_role) as roles
            FROM TBLLOGIN l
            LEFT JOIN TBLUSER p ON l.id = p.login_id
            LEFT JOIN TBLLOGROL lr ON l.id = lr.usuario
            LEFT JOIN TBLROL r ON lr.role = r.id
            GROUP BY l.id, p.id
        `);
        res.json(usuarios);
        } catch (error) {
            res.status(500).json({ erro: "Erro ao buscar utilizadores: " + error.message });
        }
    },
    
    buscarPorId: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Segurança: Apenas o dono da conta ou admin pode ver os detalhes
            if (!req.usuario.roles.includes('admin') && req.usuario.id !== parseInt(id)) {
                return res.status(403).json({ erro: "Acesso negado. Apenas pode ver o seu próprio perfil." });
            }

            const [rows] = await db.execute(`
                SELECT l.id, p.nome, l.email, l.telefone, l.status, p.data_nascimento, p.descricao, p.apoiador, p.aceita_propaganda, p.foto_perfil, GROUP_CONCAT(r.nome_role) as roles
                FROM TBLLOGIN l
                LEFT JOIN TBLUSER p ON l.id = p.login_id
                LEFT JOIN TBLLOGROL lr ON l.id = lr.usuario
                LEFT JOIN TBLROL r ON lr.role = r.id
                WHERE l.id = ?
                GROUP BY l.id, p.id
            `, [id]);

            if (rows.length === 0) {
                return res.status(404).json({ mensagem: "Conta não encontrada." });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ erro: "Erro ao buscar os dados da conta." });
        }
    },

    registrar: async (req, res) => {
        try {
            const { nome, email, senha, telefone, propaganda } = req.body;

            if (!nome || !email || !senha) {
                return res.status(400).json({ erro: "Campos obrigatórios: nome, email, senha e data de nascimento." });
            }

            // Validação da Força da Palavra-Passe
            const regexSenha = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!regexSenha.test(senha)) {
                return res.status(400).json({ 
                    erro: "A senha deve ter pelo menos 8 caracteres, incluindo uma letra maiúscula, um número e um caractere especial." 
                });
            }

            // NOVA LÓGICA: Verificar existência de E-mail ou Telefone e checar o Status
            let queryCheck = 'SELECT id, status FROM TBLLOGIN WHERE email = ?';
            let paramsCheck = [email];
            
            if (telefone) {
                queryCheck += ' OR telefone = ?';
                paramsCheck.push(telefone);
            }

            const [contaExistente] = await db.execute(queryCheck, paramsCheck);

            const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
            const tokenVerificacao = Math.floor(100000 + Math.random() * 900000).toString();
            
            let loginId;

            if (contaExistente.length > 0) {
                const conta = contaExistente[0];

                if (conta.status === 'A') {
                    return res.status(400).json({ erro: "E-mail ou telefone já está em uso." });
                }
                if (conta.status === 'B') {
                    return res.status(403).json({ erro: "Esta conta encontra-se banida do sistema." });
                }
                if (conta.status === 'D') {
                    // Reativar conta Desativada
                    loginId = conta.id;
                    await db.execute(
                        'UPDATE TBLLOGIN SET senha = ?, telefone = ?, token_verificacao = ?, email_verificado = FALSE, status = "A" WHERE id = ?',
                        [senhaHash, telefone || null, tokenVerificacao, loginId]
                    );
                }
            } else {
                // Criar um novo login do zero
                const [loginResult] = await db.execute(
                    'INSERT INTO TBLLOGIN (email, senha, telefone, data, token_verificacao, email_verificado, status) VALUES (?, ?, ?, CURDATE(), ?, FALSE, "A")',
                    [email, senhaHash, telefone || null, tokenVerificacao]
                );
                loginId = loginResult.insertId;
            }

            // Inserir ou Atualizar na tabela de Utilizador (Perfil)
            await db.execute(
                `INSERT INTO TBLUSER (login_id, nome, aceita_propaganda) 
                 VALUES (?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE nome = VALUES(nome), aceita_propaganda = VALUES(aceita_propaganda)`,
                [loginId, nome, propaganda ? 1 : 0]
            );

            // Atribuir Role padrão (ID 2 = user) caso ainda não tenha
            await db.execute('INSERT IGNORE INTO TBLLOGROL (usuario, role) VALUES (?, ?)', [loginId, 2]);

            // Simulação do envio de e-mail (Substituir por Nodemailer em produção)
            console.log(`Código de verificação para ${email}: ${tokenVerificacao}`);

            res.status(201).json({ mensagem: "Conta processada com sucesso! Verifique o seu e-mail com o código enviado." });

        } catch (error) {
            console.error(error);
            res.status(500).json({ erro: "Erro ao registar utilizador." });
        }
    },

    verificarEmail: async (req, res) => {
        try {
            const { email, codigo } = req.body;

            // NOVA LÓGICA: Puxar também o status para validação
            const [rows] = await db.execute('SELECT id, token_verificacao, status FROM TBLLOGIN WHERE email = ?', [email]);

            if (rows.length === 0) {
                return res.status(404).json({ erro: "Conta não encontrada." });
            }

            const user = rows[0];

            // NOVA LÓGICA: Impedir verificação se a conta tiver sido banida no meio do processo
            if (user.status === 'B') {
                return res.status(403).json({ erro: "Operação não permitida: Esta conta encontra-se banida." });
            }

            if (user.token_verificacao !== codigo) {
                return res.status(400).json({ erro: "Código de verificação inválido." });
            }

            // Atualiza a base de dados para confirmar o e-mail
            await db.execute('UPDATE TBLLOGIN SET email_verificado = TRUE, token_verificacao = NULL WHERE id = ?', [user.id]);

            res.json({ mensagem: "E-mail verificado com sucesso! Já pode iniciar sessão." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ erro: "Erro ao verificar o e-mail." });
        }
    },

    login: async (req, res) => {
        try {
            const { email, senha } = req.body;

            const [rows] = await db.execute(`
                SELECT l.*, p.nome, r.nome_role 
                FROM TBLLOGIN l
                LEFT JOIN TBLUSER p ON l.id = p.login_id
                LEFT JOIN TBLLOGROL lr ON l.id = lr.usuario
                LEFT JOIN TBLROL r ON lr.role = r.id
                WHERE l.email = ? AND l.auth_provider = 'local'`, [email]);

            // NOVA LÓGICA: Sem conta (redireciona para registrar)
            if (rows.length === 0) {
                return res.status(404).json({ 
                    erro: "Conta não encontrada. Redirecionando para o registo...", 
                    acao: "registrar" 
                });
            }

            const user = rows[0];

            // NOVA LÓGICA: Verificar status Banido ('B') ou Desativado ('D')
            if (user.status === 'B') {
                return res.status(403).json({ erro: "Acesso negado: Esta conta encontra-se banida do sistema." });
            }

            if (user.status === 'D') {
                return res.status(403).json({ 
                    erro: "Conta desativada. Redirecionando para reativar o registo...", 
                    acao: "registrar" 
                });
            }

            // Mantém a lógica original de verificação de e-mail e senha
            if (!user.email_verificado) {
                return res.status(403).json({ 
                    erro: "E-mail não verificado.", 
                    precisaVerificar: true 
                });
            }

            const senhaValida = await bcrypt.compare(senha, user.senha);
            const roles = rows.map(r => r.nome_role).filter(role => role !== null);

            // Atualiza a data do último acesso
            await db.execute('UPDATE TBLLOGIN SET ultimo_acesso = NOW() WHERE id = ?', [user.id]);

            const token = jwt.sign(
                { id: user.id, nome: user.nome, roles: roles }, 
                JWT_SECRET, 
                { expiresIn: '12h' }
            );

            res.json({
                mensagem: "Login realizado com sucesso!",
                token: token,
                usuario: { id: user.id, nome: user.nome, roles: roles }
            });

        } catch (error) {
            res.status(500).json({ erro: "Erro interno no servidor." });
        }
    },

    loginGoogle: async (req, res) => {
        try {
            const { token } = req.body; // Agora recebemos apenas o token do frontend

            // 1. O Backend verifica a autenticidade do token com a Google
            const ticket = await googleClient.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
        
            // 2. Extraímos os dados 100% confiáveis direto da Google
            const payload = ticket.getPayload();
            const email = payload['email'];
            const nome = payload['name'];
            const provider_id = payload['sub'];
            const foto_url = payload['picture'];

            // 3. Verifica se o e-mail já existe na nossa base de dados
            const [rows] = await db.execute(`
                SELECT l.*, p.nome as nome_perfil, r.nome_role 
                FROM TBLLOGIN l
                LEFT JOIN TBLUSER p ON l.id = p.login_id
                LEFT JOIN TBLLOGROL lr ON l.id = lr.usuario
                LEFT JOIN TBLROL r ON lr.role = r.id
                WHERE l.email = ?`, [email]);

            // NOVA LÓGICA: Sem conta (redireciona para registrar)
            if (rows.length === 0) {
                return res.status(404).json({ 
                    erro: "Conta não encontrada. Redirecionando para o registo...", 
                    acao: "registrar",
                    // Enviamos os dados do Google para o frontend poder pré-preencher os campos!
                    dadosPreenchimento: { nome, email } 
                });
            }

            const user = rows[0];
            const roles = rows.map(r => r.nome_role).filter(role => role !== null);

            // NOVA LÓGICA: Verificar status Banido ('B') ou Desativado ('D')
            if (user.status === 'B') {
                return res.status(403).json({ erro: "Acesso negado: Esta conta encontra-se banida do sistema." });
            }

            if (user.status === 'D') {
                return res.status(403).json({ 
                    erro: "Conta desativada. Redirecionando para reativar o registo...", 
                    acao: "registrar",
                    dadosPreenchimento: { nome, email }
                });
            }

            // Se passar por todas as verificações e for uma conta local antiga, vinculamos ao Google
            if (user.auth_provider === 'local') {
                await db.execute('UPDATE TBLLOGIN SET auth_provider = ?, provider_id = ?, email_verificado = TRUE WHERE id = ?', 
                ['google', provider_id, user.id]);
            }

            // Atualiza a data do último acesso
            await db.execute('UPDATE TBLLOGIN SET ultimo_acesso = NOW() WHERE id = ?', [user.id]);

            // 4. Gera o nosso JWT e devolve ao frontend
            const nossoToken = jwt.sign(
                { id: user.id, nome: user.nome_perfil || nome, roles: roles }, 
                JWT_SECRET, 
                { expiresIn: '12h' }
            );

            res.json({
                mensagem: "Login com Google verificado e realizado com sucesso!",
                token: nossoToken,
                usuario: { id: user.id, nome: user.nome_perfil || nome, roles: roles, foto: foto_url }
            });

        } catch (error) {
            console.error("Erro na verificação do token Google:", error);
            res.status(401).json({ erro: "Token do Google inválido ou expirado." });
        }
    },


    atualizarLogin: async (req, res) => {
        try {
            const { id } = req.params;
            const { email, telefone } = req.body;

            // Verifica se é admin ou o próprio dono da conta
            if (!req.usuario.roles.includes('admin') && req.usuario.id !== parseInt(id)) {
                return res.status(403).json({ erro: "Não tem permissão para editar este login." });
            }

            const [resultLogin] = await db.execute(
                'UPDATE TBLLOGIN SET email = ?, telefone = ? WHERE id = ?',
                [email, telefone, id]
            );

            if (resultLogin.affectedRows === 0) {
                return res.status(404).json({ erro: "Conta não encontrada." });
            }

            res.json({ mensagem: "Credenciais de acesso atualizadas com sucesso!" });
        } catch (error) {
            res.status(400).json({ erro: "Erro ao atualizar credenciais: " + error.message });
        }
    },

    atualizarUser: async (req, res) => {
        try {
            const { id } = req.params;
            const { nome, descricao } = req.body;

            if (!req.usuario.roles.includes('admin') && req.usuario.id !== parseInt(id)) {
                return res.status(403).json({ erro: "Não tem permissão para editar este perfil." });
            }

            const [resultUser] = await db.execute(
                'UPDATE TBLUSER SET nome = ?, descricao = ? WHERE login_id = ?',
                [nome, descricao || null, id]
            );

            if (resultUser.affectedRows === 0) {
                return res.status(404).json({ erro: "Perfil de utilizador não encontrado." });
            }

            res.json({ mensagem: "Perfil público atualizado com sucesso!" });
        } catch (error) {
            res.status(400).json({ erro: "Erro ao atualizar perfil: " + error.message });
        }
    },

    apagar: async (req, res) => {
       try {
        const { id } = req.params;

        const [result] = await db.execute('DELETE FROM TBLLOGIN WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Utilizador não encontrado." });
        }

        res.json({ mensagem: `Utilizador com ID ${id} removido com sucesso!` });
        } catch (error) {
         res.status(500).json({ erro: "Erro ao apagar utilizador." });
        }
    },

    desativar: async (req, res) => {
        try {
            const { id } = req.params;

            // NOVA LÓGICA: Soft Delete. Em vez de apagar fisicamente, mudamos o status para 'D' (Desativado)
            // Assim, mantemos as listas e o histórico salvos, caso ele decida reativar a conta no futuro!
            const [result] = await db.execute('UPDATE TBLLOGIN SET status = "D" WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ erro: "Conta não encontrada." });
            }

            res.json({ mensagem: `Conta com ID ${id} desativada com sucesso!` });
        } catch (error) {
            console.error(error);
            res.status(500).json({ erro: "Erro ao desativar a conta." });
        }
    }
};

// Exporta o controlador no final do ficheiro
module.exports = loginController;