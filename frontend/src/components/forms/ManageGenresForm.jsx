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
  const [loading, setLoading] = React.useState(false);

  const normalizeItems = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/genres");      // backend: { items: [...] }
      setItems(normalizeItems(res.data));
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar gêneros", duration: 2500 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    try {
      await api.post("/genres", { name: n });    // body: { name }
      setName("");
      await load();
      toast({ title: "Gênero adicionado", duration: 1500 });
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
      await api.delete(`/genres/${id}`);
      await load();
      toast({ title: "Removido", duration: 1200 });
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
      <CardHeader><CardTitle>Gêneros</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do gênero"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button onClick={add} disabled={!name.trim() || loading}>
            Adicionar
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {items.map((g) => (
            <Badge
              key={g.id}
              className="cursor-pointer"
              onClick={() => remove(g.id)}
              title="Clique para remover"
            >
              {g.name}
            </Badge>
          ))}
          {!items.length && (
            <p className="text-sm text-gray-500">Nenhum gênero cadastrado.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
