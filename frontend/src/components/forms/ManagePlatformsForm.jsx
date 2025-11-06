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

export default function ManagePlatformsForm() {
  const { toast } = useToast();
  const [items, setItems] = React.useState([]);
  const [name, setName] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const normalizeItems = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/platforms"); // backend: { items: [...] }
      setItems(normalizeItems(res.data));
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar plataformas", duration: 2500 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const add = async () => {
    const n = name.trim();
    const w = website.trim();
    const l = logoUrl.trim();
    if (!n) return;

    if (w && !isHttpUrl(w)) { toast({ title: "Website inválido.", duration: 2000 }); return; }
    if (l && !isHttpUrl(l)) { toast({ title: "Logo URL inválida.", duration: 2000 }); return; }

    try {
      await api.post("/platforms", { name: n, website: w || undefined, logoUrl: l || undefined });
      setName(""); setWebsite(""); setLogoUrl("");
      await load();
      toast({ title: "Plataforma adicionada", duration: 1500 });
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
      await api.delete(`/platforms/${id}`);
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
      <CardHeader><CardTitle>Plataformas</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (ex.: Netflix)"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Website (opcional)"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="Logo URL (opcional)"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <Button onClick={add} disabled={!name.trim() || loading}>Adicionar</Button>

        <ul className="text-sm space-y-2">
          {items.map((p) => (
            <li key={p.id} className="flex justify-between items-center">
              <span className="truncate">
                {p.name} {p.website && <span className="text-gray-500">— {p.website}</span>}
              </span>
              <Button size="sm" variant="outline" onClick={() => remove(p.id)}>Remover</Button>
            </li>
          ))}
          {!items.length && <p className="text-sm text-gray-500">Nenhuma plataforma cadastrada.</p>}
        </ul>
      </CardContent>
    </Card>
  );
}
