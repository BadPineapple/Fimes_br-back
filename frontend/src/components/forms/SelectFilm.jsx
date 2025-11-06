import React from "react";
import api from "../../services/api";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export default function SelectFilm({ value, onChange }) {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [seq, setSeq] = React.useState(0); // evita sobrescrita fora de ordem

  const normalizeItems = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

  const search = React.useCallback(async () => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const mySeq = seq + 1;
    setSeq(mySeq);
    try {
      setLoading(true);
      // GET /films/search?q=...
      const res = await api.get(`/films/search`, { params: { q: term } });
      // apenas aplica se esta resposta é a mais recente
      if (mySeq === seq + 1 || mySeq === seq) {
        setResults(normalizeItems(res.data));
      }
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [q, seq]);

  React.useEffect(() => {
    const t = setTimeout(search, 400); // debounce
    return () => clearTimeout(t);
  }, [q, search]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Buscar filme..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <Button variant="outline" onClick={search} disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>

      <ul className="max-h-56 overflow-auto border rounded">
        {results.map((f) => (
          <li
            key={f.id}
            className={`px-3 py-2 cursor-pointer hover:bg-muted ${
              value?.id === f.id ? "bg-muted" : ""
            }`}
            title={f.slug ? `/${f.slug}` : undefined}
            onClick={() => onChange?.(f)}
          >
            {f.title} {f.year ? `(${f.year})` : ""}
          </li>
        ))}
        {results.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-500">
            {loading ? "Carregando..." : "Nenhum resultado."}
          </li>
        )}
      </ul>

      {value && (
        <div className="text-sm">
          Selecionado: <strong>{value.title}</strong>{" "}
          {value.year ? `(${value.year})` : ""}
        </div>
      )}
    </div>
  );
}
