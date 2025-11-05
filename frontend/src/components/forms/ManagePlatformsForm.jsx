import React from "react";
import api from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useToast } from "../../hooks/use-toast";

export default function ManagePlatformsForm() {
  const { toast } = useToast();
  const [items, setItems] = React.useState([]);
  const [name, setName] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      // GET /platforms
      const res = await api.get("/platforms");
      setItems(res.data ?? []);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar plataformas", duration: 2500 });
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    try {
      // POST /platforms { name, website?, logoUrl? }
      await api.post("/platforms", { name: n, website: website || undefined, logoUrl: logoUrl || undefined });
      setName(""); setWebsite(""); setLogoUrl("");
      load();
      toast({ title: "Plataforma adicionada", duration: 1500 });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao adicionar", duration: 2500 });
    }
  };

  const remove = async (id) => {
    try {
      // DELETE /platforms/:id
      await api.delete(`/platforms/${id}`);
      load();
      toast({ title: "Removida", duration: 1200 });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao remover", duration: 2500 });
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Plataformas</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex.: Netflix)" />
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website (opcional)" />
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Logo URL (opcional)" />
        </div>
        <Button onClick={add}>Adicionar</Button>
        <ul className="text-sm list-disc pl-5">
          {items.map(p => (
            <li key={p.id} className="flex justify-between items-center">
              <span>{p.name} {p.website && <span className="text-gray-500">— {p.website}</span>}</span>
              <Button size="sm" variant="outline" onClick={() => remove(p.id)}>Remover</Button>
            </li>
          ))}
          {items.length === 0 && <p className="text-sm text-gray-500">Nenhuma plataforma cadastrada.</p>}
        </ul>
      </CardContent>
    </Card>
  );
}
