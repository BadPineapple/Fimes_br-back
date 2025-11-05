import React from "react";
import api from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useToast } from "../../hooks/use-toast";

export default function ManageTagsForm() {
  const { toast } = useToast();
  const [items, setItems] = React.useState([]);
  const [name, setName] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      // GET /tags
      const res = await api.get("/tags");
      setItems(res.data ?? []);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar tags", duration: 2500 });
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    try {
      // POST /tags { name }
      await api.post("/tags", { name: n });
      setName("");
      load();
      toast({ title: "Tag adicionada", duration: 1500 });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao adicionar", duration: 2500 });
    }
  };

  const remove = async (id) => {
    try {
      // DELETE /tags/:id
      await api.delete(`/tags/${id}`);
      load();
      toast({ title: "Removida", duration: 1200 });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao remover", duration: 2500 });
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da tag" />
          <Button onClick={add}>Adicionar</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map(t => (
            <Badge key={t.id} className="cursor-pointer" onClick={() => remove(t.id)} title="Clique para remover">
              {t.name}
            </Badge>
          ))}
          {items.length === 0 && <p className="text-sm text-gray-500">Nenhuma tag cadastrada.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
