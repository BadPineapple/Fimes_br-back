import React from "react";
import api from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import SelectFilm from "./SelectFilm";
import { useToast } from "../../hooks/use-toast";

// WatchType igual ao backend
const WATCH_TYPES = [
  { value: "SUBSCRIPTION", label: "Assinatura" },
  { value: "RENT",         label: "Aluguel" },
  { value: "BUY",          label: "Compra" },
  { value: "FREE",         label: "Grátis" },
];

function normalizeItems(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
}
function isHttpUrl(v) {
  if (!v) return true; // opcional
  try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; }
  catch { return false; }
}

export default function LinkFilmRelationsForm() {
  const { toast } = useToast();

  const [film, setFilm] = React.useState(null);

  const [genres, setGenres] = React.useState([]);
  const [tags, setTags] = React.useState([]);
  const [people, setPeople] = React.useState([]);
  const [platforms, setPlatforms] = React.useState([]);
  const [loadingLists, setLoadingLists] = React.useState(false);

  const [genreId, setGenreId] = React.useState("");
  const [tagId, setTagId] = React.useState("");

  const [personId, setPersonId] = React.useState("");
  const [role, setRole] = React.useState("ACTOR");
  const [characterName, setCharacterName] = React.useState("");
  const [billingOrder, setBillingOrder] = React.useState("");

  const [platformId, setPlatformId] = React.useState("");
  const [watchType, setWatchType] = React.useState("SUBSCRIPTION");
  const [region, setRegion] = React.useState("BR");
  const [url, setUrl] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        setLoadingLists(true);
        const [g, t, p, s] = await Promise.all([
          api.get("/genres"),
          api.get("/tags"),
          api.get("/people"),
          api.get("/platforms"),
        ]);
        setGenres(normalizeItems(g.data));
        setTags(normalizeItems(t.data));
        setPeople(normalizeItems(p.data));
        setPlatforms(normalizeItems(s.data));
      } catch (e) {
        console.error(e);
        toast({ title: "Erro ao carregar listas base (gêneros/tags/pessoas/plataformas).", duration: 3000 });
      } finally {
        setLoadingLists(false);
      }
    })();
  }, [toast]);

  const guardRoleError = (e, msgDefault) => {
    const status = e?.response?.status;
    if (status === 401 || status === 403) {
      toast({ title: "Acesso negado: precisa ser moderador.", duration: 2500 });
    } else {
      toast({ title: msgDefault, duration: 2500 });
    }
  };

  const linkGenre = async () => {
    if (!film?.id || !genreId) return;
    setSubmitting(true);
    try {
      await api.post(`/films/${film.id}/genres`, { genreId });
      toast({ title: "Gênero vinculado", duration: 1200 });
      setGenreId("");
    } catch (e) {
      console.error(e);
      guardRoleError(e, "Erro ao vincular gênero.");
    } finally {
      setSubmitting(false);
    }
  };

  const linkTag = async () => {
    if (!film?.id || !tagId) return;
    setSubmitting(true);
    try {
      await api.post(`/films/${film.id}/tags`, { tagId });
      toast({ title: "Tag vinculada", duration: 1200 });
      setTagId("");
    } catch (e) {
      console.error(e);
      guardRoleError(e, "Erro ao vincular tag.");
    } finally {
      setSubmitting(false);
    }
  };

  const linkPerson = async () => {
    if (!film?.id || !personId) return;
    const billing = billingOrder ? Number(billingOrder) : undefined;
    if (billingOrder && (!Number.isFinite(billing) || billing < 1)) {
      toast({ title: "Ordem deve ser número inteiro ≥ 1.", duration: 2200 });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/films/${film.id}/people`, {
        personId,
        role,
        characterName: characterName || undefined,
        billingOrder: billing,
      });
      toast({ title: "Pessoa vinculada", duration: 1200 });
      setPersonId("");
      setCharacterName("");
      setBillingOrder("");
      setRole("ACTOR");
    } catch (e) {
      console.error(e);
      guardRoleError(e, "Erro ao vincular pessoa.");
    } finally {
      setSubmitting(false);
    }
  };

  const linkAvailability = async () => {
    if (!film?.id || !platformId) return;
    if (url && !isHttpUrl(url)) {
      toast({ title: "URL inválida.", duration: 2200 });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/films/${film.id}/availability`, {
        platformId,
        type: watchType,
        region: region || undefined,
        url: url || undefined,
      });
      toast({ title: "Disponibilidade adicionada", duration: 1200 });
      setPlatformId("");
      setWatchType("SUBSCRIPTION");
      setRegion("BR");
      setUrl("");
    } catch (e) {
      console.error(e);
      guardRoleError(e, "Erro ao adicionar disponibilidade.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Vincular a Filme</CardTitle></CardHeader>
      <CardContent className="space-y-8">
        {/* 1) Escolha do filme */}
        <div>
          <h3 className="font-semibold mb-2">1) Escolha o filme</h3>
          <SelectFilm value={film} onChange={setFilm} />
        </div>

        {/* 2) Gênero */}
        <div>
          <h3 className="font-semibold mb-2">2) Gêneros</h3>
          <div className="flex gap-2">
            <Select value={genreId} onValueChange={setGenreId} disabled={loadingLists}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Selecione um gênero" /></SelectTrigger>
              <SelectContent>
                {genres.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={linkGenre} disabled={!film || !genreId || submitting}>Vincular</Button>
          </div>
        </div>

        {/* 3) Tag */}
        <div>
          <h3 className="font-semibold mb-2">3) Tags</h3>
          <div className="flex gap-2">
            <Select value={tagId} onValueChange={setTagId} disabled={loadingLists}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Selecione uma tag" /></SelectTrigger>
              <SelectContent>
                {tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={linkTag} disabled={!film || !tagId || submitting}>Vincular</Button>
          </div>
        </div>

        {/* 4) Pessoas */}
        <div>
          <h3 className="font-semibold mb-2">4) Pessoas (ator/diretor)</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Select value={personId} onValueChange={setPersonId} disabled={loadingLists}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a pessoa" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTOR">Ator/Atriz</SelectItem>
                <SelectItem value="DIRECTOR">Diretor(a)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Personagem (opcional)"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && linkPerson()}
            />
            <Input
              placeholder="Ordem (1,2… opcional)"
              value={billingOrder}
              onChange={(e) => setBillingOrder(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && linkPerson()}
            />
            <Button onClick={linkPerson} disabled={!film || !personId || submitting}>Vincular</Button>
          </div>
        </div>

        {/* 5) Onde assistir */}
        <div>
          <h3 className="font-semibold mb-2">5) Onde assistir</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Select value={platformId} onValueChange={setPlatformId} disabled={loadingLists}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Plataforma" /></SelectTrigger>
              <SelectContent>
                {platforms.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={watchType} onValueChange={setWatchType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WATCH_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Região (ex.: BR)"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && linkAvailability()}
            />
            <Input
              placeholder="URL (opcional)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && linkAvailability()}
            />
            <Button onClick={linkAvailability} disabled={!film || !platformId || submitting}>
              Adicionar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
