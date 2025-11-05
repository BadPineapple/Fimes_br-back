import React from "react";
import api from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useToast } from "../../hooks/use-toast";

export default function ManagePeopleForm() {
  const { toast } = useToast();
  const [items, setItems] = React.useState([]);
  const [name, setName] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      // GET /people
      const res = await api.get("/people");
      setItems(res.data ?? []);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar pessoas", duration: 2500 });
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    try {
      // POST /people { name, photoUrl? }
      await api.post("/people", { name: n, photoUrl: photoUrl || undefined });
      setName(""); setPhotoUrl("");
      load();
      toast({ title: "Pessoa adicionada", duration: 1500 });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao adicionar", duration: 2500 });
    }
  };

  const remove = async (id) => {
    try {
      // DELETE /people/:id
      await api.delete(`/people/${id}`);
      load();
      toast({ title: "Removida", duration: 1200 });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao remover", duration: 2500 });
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Pessoas (Atores/Diretores)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
          <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Foto URL (opcional)" />
        </div>
        <Button onClick={add}>Adicionar</Button>
        <ul className="text-sm list-disc pl-5">
          {items.map(p => (
            <li key={p.id} className="flex justify-between items-center">
              <span>{p.name}</span>
              <Button size="sm" variant="outline" onClick={() => remove(p.id)}>Remover</Button>
            </li>
          ))}
          {items.length === 0 && <p className="text-sm text-gray-500">Nenhuma pessoa cadastrada.</p>}
        </ul>
      </CardContent>
    </Card>
  );
}
