const jwt = require('jsonwebtoken');

const verificarAcesso = (rolesPermitidas) => {
    return (req, res, next) => {
        // 1. Pega o token do cabeçalho da requisição
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

        if (!token) return res.status(401).json({ erro: "Acesso negado. Token não fornecido." });

        try {
            // 2. Valida o token com a nossa chave secreta
            const usuarioLogado = jwt.verify(token, process.env.JWT_SECRET);
            req.usuario = usuarioLogado;

            // 3. Verificação de Nível (Autorização)
            if (rolesPermitidas && !rolesPermitidas.includes(usuarioLogado.role)) {
                return res.status(403).json({ erro: "Proibido! Você não tem permissão para isso." });
            }

            next(); // Passou no teste! Pode seguir para a rota.
        } catch (err) {
            res.status(403).json({ erro: "Token inválido ou expirado." });
        }
    };
};

module.exports = verificarAcesso;