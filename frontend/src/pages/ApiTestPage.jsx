import React from "react";

export default function ApiTestPage() {
  const [result, setResult] = React.useState("Carregando...");

  React.useEffect(() => {
    const test = async () => {
      try {
        setResult("Testando API...");
        
        // Teste direto com fetch
        const response = await fetch("http://localhost:8001/api/films");
        const data = await response.json();
        
        setResult(`✅ Sucesso! ${data.length} filmes encontrados:\n${data.map(f => f.title).join('\n')}`);
        
      } catch (error) {
        setResult(`❌ Erro: ${error.message}`);
      }
    };
    
    test();
  }, []);

  return (
    <div style={{padding: '20px'}}>
      <h1>Teste da API</h1>
      <div style={{background: '#f0f0f0', padding: '20px', whiteSpace: 'pre-line'}}>
        {result}
      </div>
    </div>
  );
}