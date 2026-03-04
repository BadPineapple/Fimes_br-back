const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar se o utilizador está autenticado 
 * e se possui a permissão necessária.
 * @param {Array} rolesPermitidas - Lista de roles que podem aceder (ex: ['admin', 'editor'])
 */
const verificarAcesso = (rolesPermitidas = []) => {
    return (req, res, next) => {
        // 1. Obter o token do cabeçalho 'Authorization'
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

        if (!token) {
            return res.status(401).json({ erro: "Acesso negado. Token não fornecido." });
        }

        try {
            // 2. Verificar se o token é válido
            const usuarioDecodificado = jwt.verify(token, process.env.JWT_SECRET);
            
            // Guardamos os dados do utilizador na requisição para uso futuro
            req.usuario = usuarioDecodificado;

            // 3. Verificação de Autorização (RBAC)
            // Se a lista de roles permitidas estiver vazia, qualquer utilizador logado entra
            if (rolesPermitidas.length > 0) {
                // Previne falhas (crash) se o token for antigo e não tiver 'roles' definidas
                const userRoles = usuarioDecodificado.roles || [];
                
                const temPermissao = userRoles.some(role => 
                    rolesPermitidas.includes(role)
                );

                if (!temPermissao) {
                    return res.status(403).json({ 
                        erro: "Proibido: Não tem permissão suficiente para realizar esta ação." 
                    });
                }
            }

            // 4. Se chegou aqui, está tudo OK!
            next();
        } catch (err) {
            // Diferenciar o erro ajuda o frontend a redirecionar para a página de Login corretamente
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ erro: "A sessão expirou. Por favor, inicie sessão novamente." });
            }
            return res.status(403).json({ erro: "Token inválido ou adulterado." });
        }
    };
};

// Exportamos a função principal e atalhos rápidos para usar nas rotas
module.exports = {
    verificarAcesso,
    somenteAdmin: verificarAcesso(['admin']),
    autenticado: verificarAcesso() // Qualquer utilizador com sessão iniciada
};