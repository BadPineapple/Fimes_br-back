const db = require('../db/db' );  

// Carrega o modelo de forma global para não repetir o carregamento
let extractorInstance = null;

// Função interna para obter o extrator (Singleton)
const getExtractor = async () => {
    if (!extractorInstance) {
        console.log("A carregar modelo local (Xenova/all-MiniLM-L6-v2)...");
        const { pipeline } = await import('@xenova/transformers');
        extractorInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log("Modelo carregado com sucesso!");
    }
    return extractorInstance;
};

// Função matemática auxiliar para similaridade
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0, mA = 0, mB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        mA += vecA[i] * vecA[i];
        mB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

// --- FUNÇÃO DE SINCRONIZAÇÃO ---
exports.syncVectors = async (req, res) => {
    try {
        const pipe = await getExtractor();
        
        // Busca todos os filmes com seus relacionamentos
        const [rows] = await db.query(`
            SELECT f.IDFIL, f.NOMFIL, f.SINOPSE, 
                   GROUP_CONCAT(DISTINCT g.NOMGEN SEPARATOR ', ') as GENEROS,
                   GROUP_CONCAT(DISTINCT p.NOMPES SEPARATOR ', ') as DIRETORES
            FROM tblfil f
            LEFT JOIN tblfil_gen fg ON f.IDFIL = fg.IDFIL
            LEFT JOIN tblgen g ON fg.IDGEN = g.IDGEN
            LEFT JOIN tblfil_pes fp ON f.IDFIL = fp.IDFIL
            LEFT JOIN tblpes p ON fp.IDPES = p.IDPES
            GROUP BY f.IDFIL
        `);

        if (rows.length === 0) {
            return res.json({ message: "Nenhum filme encontrado para sincronizar." });
        }

        console.log(`Iniciando vetorização de ${rows.length} filmes...`);

        // REATORAÇÃO: Processamento em Lotes (Batches) para não estourar a memória
        const BATCH_SIZE = 50; 
        
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const lote = rows.slice(i, i + BATCH_SIZE);
            
            // Processa o lote atual em paralelo para ganhar velocidade
            await Promise.all(lote.map(async (row) => {
                const content = `${row.NOMFIL}. ${row.SINOPSE}. Gêneros: ${row.GENEROS || 'N/A'}. Diretores: ${row.DIRETORES || 'N/A'}.`;
                
            // 1. Atualiza o texto de busca na tabela principal
                await db.query("UPDATE tblfil SET SEACONT = ? WHERE IDFIL = ?", [content, row.IDFIL]);

            // 2. Gera o vetor matemático
                const output = await pipe(content, { pooling: 'mean', normalize: true });
                const vectorArray = Array.from(output.data);

            // 3. Guarda ou Atualiza na tabela de vetores
                await db.query(`
                    INSERT INTO tblfil_vectors (IDFIL, VECTOR_DATA) 
                    VALUES (?, ?) 
                    ON DUPLICATE KEY UPDATE VECTOR_DATA = VALUES(VECTOR_DATA)`, 
                    [row.IDFIL, JSON.stringify(vectorArray)]
                );
            }));
            
            console.log(`Lote processado: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
        }

        res.json({ message: `Sincronização completa: ${rows.length} filmes vetorizados.` });
    } catch (error) {
        console.error("Erro na sincronização RAG:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- FUNÇÃO DE RECOMENDAÇÃO ---
exports.recommendMovie = async (req, res) => {
    try {
        const { description } = req.body;
        if (!description) return res.status(400).json({ error: "Descrição necessária" });

        const pipe = await getExtractor();

        // 1. Vetoriza a pergunta do utilizador
        const output = await pipe(description, { pooling: 'mean', normalize: true });
        const userVector = Array.from(output.data);

        // 2. REFATORAÇÃO: JOIN aprimorado para trazer todos os dados que o Front-End (FilmCard) exige
        const [storedVectors] = await db.query(`
            SELECT 
                v.VECTOR_DATA, 
                f.IDFIL, f.NOMFIL, f.SINOPSE, f.ANO, f.NOTEXT, f.IMAGEM,
                GROUP_CONCAT(DISTINCT g.NOMGEN SEPARATOR ', ') as GENEROS
            FROM tblfil_vectors v
            JOIN tblfil f ON v.IDFIL = f.IDFIL
            LEFT JOIN tblfil_gen fg ON f.IDFIL = fg.IDFIL
            LEFT JOIN tblgen g ON fg.IDGEN = g.IDGEN
            GROUP BY f.IDFIL
        `);

        // 3. Cálculo de similaridade
        const results = storedVectors.map(sv => {
            const movieVector = JSON.parse(sv.VECTOR_DATA);
            return {
                // Mantemos o padrão maiúsculo que o seu FilmCard.tsx espera
                IDFIL: sv.IDFIL,
                NOMFIL: sv.NOMFIL,
                SINOPSE: sv.SINOPSE,
                ANO: sv.ANO,
                NOTEXT: sv.NOTEXT,
                IMAGEM: sv.IMAGEM,
                // O front-end espera um Array de gêneros
                GENEROS: sv.GENEROS ? sv.GENEROS.split(', ') : [], 
                score: cosineSimilarity(userVector, movieVector)
            };
        });

        // 4. Ordena do mais parecido para o menos parecido
        results.sort((a, b) => b.score - a.score);

        // Retorna apenas a melhor recomendação (top 1) ou mude o slice para (0, 3) se quiser mais
        res.json(results.slice(0, 1));
    } catch (error) {
        console.error("Erro na recomendação RAG:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- FUNÇÃO DE STATUS ---
exports.getRagStatus = async (req, res) => {
    try {
        const [count] = await db.query("SELECT COUNT(*) as total FROM tblfil_vectors");
        const isModelLoaded = extractorInstance !== null;

        res.json({
            status: "online",
            filmesVetorizados: count[0].total,
            modeloCarregado: isModelLoaded,
            modeloNome: 'Xenova/all-MiniLM-L6-v2'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};