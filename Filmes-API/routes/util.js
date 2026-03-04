// Função auxiliar para ler os filmes do arquivo JSON
const lerJson = (file) => {
    const dados = fs.readFileSync(file, 'utf-8');
    return JSON.parse(dados);
};

// Função auxiliar para salvar os filmes no arquivo JSON
const salvarInfo = (file, lista) => {
    fs.writeFileSync(file, JSON.stringify(lista, null, 2));
};

const estaVazio = (valor) => {
    return valor === undefined || 
                     valor === null || 
                     String(valor).trim() === '';
};

