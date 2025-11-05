import React from "react";
import api from "../../services/api";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export default function SelectFilm({ value, onChange }) {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState([]);

  const search = React.useCallback(async () => {
    if (!q.trim()) { setResults([]); return; }
    // GET /films/search?q=...
    const res = await api.get(`/films/search`, { params: { q }});
    setResults(res.data ?? []);
  }, [q]);

  React.useEffect(() => {
    const t = setTimeout(search, 400); // debounce
    return () => clearTimeout(t);
  }, [q, search]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Buscar filme..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" onClick={search}>Buscar</Button>
      </div>
      <ul className="max-h-56 overflow-auto border rounded">
        {results.map(f => (
          <li key={f.id}
              className={`px-3 py-2 cursor-pointer hover:bg-muted ${value?.id===f.id ? "bg-muted" : ""}`}
              onClick={() => onChange?.(f)}>
            {f.title} {f.year ? `(${f.year})` : ""}
          </li>
        ))}
        {results.length===0 && <li className="px-3 py-2 text-sm text-gray-500">Nenhum resultado.</li>}
      </ul>
      {value && <div className="text-sm">Selecionado: <strong>{value.title}</strong></div>}
    </div>
  );
}
