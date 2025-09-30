// frontend/src/components/forms/AddFilmForm.jsx
import React from "react";
import api from "../../services/api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useToast } from "../../hooks/use-toast";

// Validação simples de URL http/https
function isValidHttpUrl(str) {
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
    banner_url: "",
    description: "",
    year: "",
    director: "",
    actors: "",
    imdb_rating: "",
    letterboxd_rating: "",
    tags: "",
    watch_links: [{ platform: "", url: "" }],
  });
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const addWatch = () =>
    setForm((f) => ({ ...f, watch_links: [...f.watch_links, { platform: "", url: "" }] }));

  const updateWatch = (i, field, value) => {
    setForm((f) => {
      const n = f.watch_links.slice();
      n[i] = { ...n[i], [field]: value };
      return { ...f, watch_links: n };
    });
  };

  const removeWatch = (i) =>
    setForm((f) => ({ ...f, watch_links: f.watch_links.filter((_, idx) => idx !== i) }));

  const submit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  // Normaliza números com bounds
  function parseYear(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    if (n < 1895 || n > 2100) return null; // cinema começou ~1895
    return n;
  }
  function parseImdb(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(10, Math.max(0, n));
  }
  function parseLb(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(5, Math.max(0, n));
  }
  function computeUnifiedRating(imdb10, lb5) {
    // Média simples normalizada para 0–10, se ambos existirem
    const vals = [];
    if (imdb10 != null) vals.push(imdb10);
    if (lb5 != null) vals.push(lb5 * 2); // converte 0–5 -> 0–10
    if (!vals.length) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 10) / 10; // 1 casa decimal
  }

  const confirm = async () => {
    // ⚠️ Observação: senha no cliente é fácil de inspecionar. Ideal validar no backend via role.
    if (password !== "1357") {
      toast({ title: "Senha incorreta", duration: 2500 });
      return;
    }

    // Sanitização e mapeamento p/ contrato usado nas outras telas
    const year = parseYear(form.year);
    const imdb = parseImdb(form.imdb_rating);
    const lb = parseLb(form.letterboxd_rating);

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const actors = form.actors
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const watch_links = form.watch_links
      .map((l) => ({ platform: l.platform.trim(), url: l.url.trim() }))
      .filter((l) => l.platform && l.url && isValidHttpUrl(l.url));

    // Mapeia para campos esperados em outras partes do front:
    const payload = {
      title: form.title.trim(),
      poster_url: form.banner_url.trim() || undefined,
      synopsis: form.description.trim(),
      year,
      director: form.director.trim() || undefined,
      actors,
      genres: tags,
      rating: computeUnifiedRating(imdb, lb),
      ratings: {
        imdb: imdb ?? null,
        letterboxd: lb ?? null,
      },
      watch_links,
      // Mantém também os nomes “originais” se seu backend espera esses campos:
      banner_url: form.banner_url.trim() || undefined,
      description: form.description.trim(),
      imdb_rating: imdb,
      letterboxd_rating: lb,
      tags, // array já normalizado
    };

    if (!payload.title || !payload.synopsis) {
      toast({ title: "Preencha os campos obrigatórios (Título e Sinopse).", duration: 3000 });
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/films", payload);
      toast({ title: "Filme adicionado com sucesso!", duration: 2500 });
      onSuccess?.();
      setForm({
        title: "",
        banner_url: "",
        description: "",
        year: "",
        director: "",
        actors: "",
        imdb_rating: "",
        letterboxd_rating: "",
        tags: "",
        watch_links: [{ platform: "", url: "" }],
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
        <CardDescription>Preencha as informações do filme para adicionar ao catálogo</CardDescription>
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
                <label className="block text-sm font-medium mb-2">Diretor</label>
                <Input
                  value={form.director}
                  onChange={(e) => setForm({ ...form, director: e.target.value })}
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">URL da Capa</label>
                <Input
                  placeholder="https://..."
                  value={form.banner_url}
                  onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">IMDB Rating (0–10)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={form.imdb_rating}
                  onChange={(e) => setForm({ ...form, imdb_rating: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Letterboxd Rating (0–5)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.letterboxd_rating}
                  onChange={(e) => setForm({ ...form, letterboxd_rating: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Atores Principais</label>
                <Input
                  value={form.actors}
                  onChange={(e) => setForm({ ...form, actors: e.target.value })}
                  placeholder="separe por vírgula"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tags/Gêneros</label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="separe por vírgula"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sinopse *</label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Onde Assistir</label>
            {form.watch_links.map((l, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input
                  className="flex-1"
                  placeholder="Plataforma"
                  value={l.platform}
                  onChange={(e) => updateWatch(i, "platform", e.target.value)}
                />
                <Input
                  className="flex-1"
                  placeholder="URL"
                  value={l.url}
                  onChange={(e) => updateWatch(i, "url", e.target.value)}
                />
                {form.watch_links.length > 1 && (
                  <Button type="button" variant="outline" className="px-3" onClick={() => removeWatch(i)}>
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addWatch} className="mt-2">
              + Adicionar Link
            </Button>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
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
