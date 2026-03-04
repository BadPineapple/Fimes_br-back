const db = require('../db/db');

/**
 * Função Global para Busca, Filtro, Ordenação e Paginação
 * @param {string} tabela - Nome da tabela no banco
 * @param {object} queryParams - O req.query vindo da URL
 * @param {array} camposBusca - Quais colunas a pesquisa 'q' deve atingir
 */
async function buscarComRecursos(tabela, queryParams, camposBusca = []) {
    let { pagina = 1, limite = 10, ordem = 'id', direcao = 'ASC', q } = queryParams;
    
    pagina = parseInt(pagina);
    limite = parseInt(limite);
    const offset = (pagina - 1) * limite;

    let sql = `SELECT * FROM ${tabela} WHERE 1=1`;
    let sqlCount = `SELECT COUNT(*) as total FROM ${tabela} WHERE 1=1`;
    const values = [];

    // 1. PESQUISA GLOBAL (campo 'q')
    if (q && camposBusca.length > 0) {
        const condicoesBusca = camposBusca.map(campo => `${campo} LIKE ?`).join(' OR ');
        sql += ` AND (${condicoesBusca})`;
        sqlCount += ` AND (${condicoesBusca})`;
        camposBusca.forEach(() => values.push(`%${q}%`));
    }

    // 2. FILTROS ESPECÍFICOS (ex: ?ano=2022 ou ?genero=Ação)
    const camposIgnorar = ['pagina', 'limite', 'ordem', 'direcao', 'q'];
    Object.keys(queryParams).forEach(chave => {
        if (!camposIgnorar.includes(chave)) {
            sql += ` AND ${chave} = ?`;
            sqlCount += ` AND ${chave} = ?`;
            values.push(queryParams[chave]);
        }
    });

    // 3. ORDENAÇÃO
    // Importante: validar se a 'direcao' é ASC ou DESC para evitar SQL Injection
    const dir = direcao.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${ordem} ${dir}`;

    // 4. PAGINAÇÃO
    sql += ` LIMIT ? OFFSET ?`;
    const valuesComPaginacao = [...values, limite, offset];

    try {
        // Executa a busca dos dados e a contagem total simultaneamente
        const [dados] = await db.execute(sql, valuesComPaginacao);
        const [totalRes] = await db.execute(sqlCount, values);
        
        const totalRegistros = totalRes[0].total;
        const totalPaginas = Math.ceil(totalRegistros / limite);

        return {
            dados,
            paginacao: {
                totalRegistros,
                totalPaginas,
                paginaAtual: pagina,
                limitePorPagina: limite
            }
        };
    } catch (error) {
        throw new Error("Erro ao processar consulta: " + error.message);
    }
}

module.exports = { buscarComRecursos };