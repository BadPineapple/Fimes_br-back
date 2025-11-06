import React from "react";
import api from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useToast } from "../../hooks/use-toast";

function isHttpUrl(v) {
  try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; }
  catch { return false; }
}

export default function ManagePeopleForm() {
  const { toast } = useToast();
  const [items, setItems] = React.useState([]);
  const [name, setName] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const normalizeItems = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/people");      // backend: { items: [...] }
      setItems(normalizeItems(res.data));
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar pessoas", duration: 2500 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const add = async () => {
    const n = name.trim();
    const p = photoUrl.trim();
    if (!n) return;
    if (p && !isHttpUrl(p)) {
      toast({ title: "URL da foto inválida.", duration: 2200 });
      return;
    }
    try {
      await api.post("/people", { name: n, photoUrl: p || undefined });
      setName(""); setPhotoUrl("");
      await load();
      toast({ title: "Pessoa adicionada", duration: 1500 });
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        toast({ title: "Precisa ser moderador para adicionar.", duration: 2500 });
      } else {
        toast({ title: "Erro ao adicionar", duration: 2500 });
      }
      console.error(e);
    }
  };

  const remove = async (id) => {
    if (!id) return;
    try {
      await api.delete(`/people/${id}`);
      await load();
      toast({ title: "Removida", duration: 1200 });
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        toast({ title: "Precisa ser moderador para remover.", duration: 2500 });
      } else {
        toast({ title: "Erro ao remover", duration: 2500 });
      }
      console.error(e);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Pessoas (Atores/Diretores)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="Foto URL (opcional)"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <Button onClick={add} disabled={!name.trim() || loading}>Adicionar</Button>

        <ul className="text-sm space-y-2">
          {items.map((p) => (
            <li key={p.id} className="flex justify-between items-center">
              <span className="truncate">{p.name}</span>
              <Button size="sm" variant="outline" onClick={() => remove(p.id)}>
                Remover
              </Button>
            </li>
          ))}
          {!items.length && <p className="text-sm text-gray-500">Nenhuma pessoa cadastrada.</p>}
        </ul>
      </CardContent>
    </Card>
  );
}
