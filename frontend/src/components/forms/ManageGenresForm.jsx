import React from "react";
import api from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useToast } from "../../hooks/use-toast";

export default function ManageGenresForm() {
  const { toast } = useToast();
  const [items, setItems] = React.useState([]);
  const [name, setName] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      // GET /genres
      const res = await api.get("/genres");
      setItems(res.data ?? []);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar gêneros", duration: 2500 });
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    try {
      // POST /genres { name }
      await api.post("/genres", { name: n });
      setName("");
      load();
      toast({ title: "Gênero adicionado", duration: 1500 });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao adicionar", duration: 2500 });
    }
  };

  const remove = async (id) => {
    try {
      // DELETE /genres/:id
      await api.delete(`/genres/${id}`);
      load();
      toast({ title: "Removido", duration: 1200 });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao remover", duration: 2500 });
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Gêneros</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do gênero" />
          <Button onClick={add}>Adicionar</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map(g => (
            <Badge key={g.id} className="cursor-pointer" onClick={() => remove(g.id)} title="Clique para remover">
              {g.name}
            </Badge>
          ))}
          {items.length === 0 && <p className="text-sm text-gray-500">Nenhum gênero cadastrado.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
