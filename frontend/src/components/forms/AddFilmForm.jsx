// frontend/src/components/forms/AddFilmForm.jsx
import React from "react";
import api from "../../services/api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useToast } from "../../hooks/use-toast";

function isValidHttpUrl(str) {
  if (!str) return false;
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function AddFilmForm({ onSuccess }) {
  const { toast } = useToast();

  const [form, setForm] = React.useState({
    title: "",
    originalTitle: "",
    year: "",
    runtimeMin: "",
    coverUrl: "",
    synopsis: "",
  });

  const [showConfirm, setShowConfirm] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const submit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  // helpers de validação/conversão
  const parseYear = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    if (n < 1895 || n > 2100) return null;
    return n;
  };

  const parseRuntime = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    if (n <= 0 || n > 1000) return null; // limite razoável
    return Math.round(n);
  };

  const confirm = async () => {
    if (password !== "1357") {
      toast({ title: "Senha incorreta", duration: 2500 });
      return;
    }

    const payload = {
      title: form.title.trim(),
      originalTitle: form.originalTitle.trim() || undefined,
      year: parseYear(form.year),
      runtimeMin: parseRuntime(form.runtimeMin),
      synopsis: form.synopsis.trim(),
      coverUrl: form.coverUrl.trim() || undefined,
    };

    if (!payload.title || !payload.synopsis) {
      toast({ title: "Preencha os campos obrigatórios (Título e Sinopse).", duration: 3000 });
      return;
    }

    if (form.coverUrl && !isValidHttpUrl(form.coverUrl)) {
      toast({ title: "URL da capa inválida.", duration: 2500 });
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/films", payload);
      toast({ title: "Filme adicionado com sucesso!", duration: 2500 });
      onSuccess?.();
      // reset
      setForm({
        title: "",
        originalTitle: "",
        year: "",
        runtimeMin: "",
        coverUrl: "",
        synopsis: "",
      });
      setShowConfirm(false);
      setPassword("");
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao adicionar filme", duration: 3000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-blue-800">Adicionar Novo Filme Brasileiro</CardTitle>
        <CardDescription>Cadastre os dados base do filme. Relacionamentos (gêneros, tags, pessoas, onde assistir) são feitos nas outras abas.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Título *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Título Original</label>
                <Input
                  value={form.originalTitle}
                  onChange={(e) => setForm({ ...form, originalTitle: e.target.value })}
                  placeholder="se diferente do título em PT-BR"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ano</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1895"
                  max="2100"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  placeholder="ex.: 2002"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Duração (minutos)</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="1000"
                  value={form.runtimeMin}
                  onChange={(e) => setForm({ ...form, runtimeMin: e.target.value })}
                  placeholder="ex.: 130"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">URL da Capa</label>
                <Input
                  placeholder="https://..."
                  value={form.coverUrl}
                  onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sinopse *</label>
            <Textarea
              rows={4}
              value={form.synopsis}
              onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
              required
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            Adicionar Filme ao Catálogo
          </Button>
        </form>

        {showConfirm && (
          <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Adição de Filme</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>Digite a senha de moderador (1357):</p>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button onClick={confirm} disabled={submitting}>
                    {submitting ? "Adicionando..." : "Adicionar Filme"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
