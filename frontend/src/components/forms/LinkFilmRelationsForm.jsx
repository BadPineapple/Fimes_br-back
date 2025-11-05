import React from "react";
import api from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import SelectFilm from "./SelectFilm";
import { useToast } from "../../hooks/use-toast";

// WatchType igual ao enum do backend
const WATCH_TYPES = [
  { value: "SUBSCRIPTION", label: "Assinatura" },
  { value: "RENT", label: "Aluguel" },
  { value: "BUY", label: "Compra" },
  { value: "FREE", label: "Grátis" },
];

export default function LinkFilmRelationsForm() {
  const { toast } = useToast();

  const [film, setFilm] = React.useState(null);

  const [genres, setGenres] = React.useState([]);
  const [tags, setTags] = React.useState([]);
  const [people, setPeople] = React.useState([]);
  const [platforms, setPlatforms] = React.useState([]);

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

  React.useEffect(() => {
    (async () => {
      try {
        const [g, t, p, s] = await Promise.all([
          api.get("/genres"),
          api.get("/tags"),
          api.get("/people"),
          api.get("/platforms"),
        ]);
        setGenres(g.data ?? []); setTags(t.data ?? []);
        setPeople(p.data ?? []); setPlatforms(s.data ?? []);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const linkGenre = async () => {
    if (!film?.id || !genreId) return;
    // POST /films/:filmId/genres { genreId }
    await api.post(`/films/${film.id}/genres`, { genreId });
    toast({ title: "Gênero vinculado", duration: 1200 });
  };

  const linkTag = async () => {
    if (!film?.id || !tagId) return;
    // POST /films/:filmId/tags { tagId }
    await api.post(`/films/${film.id}/tags`, { tagId });
    toast({ title: "Tag vinculada", duration: 1200 });
  };

  const linkPerson = async () => {
    if (!film?.id || !personId) return;
    // POST /films/:filmId/people { personId, role, characterName?, billingOrder? }
    await api.post(`/films/${film.id}/people`, {
      personId, role, characterName: characterName || undefined,
      billingOrder: billingOrder ? Number(billingOrder) : undefined
    });
    toast({ title: "Pessoa vinculada", duration: 1200 });
    setCharacterName(""); setBillingOrder("");
  };

  const linkAvailability = async () => {
    if (!film?.id || !platformId) return;
    // POST /films/:filmId/availability { platformId, type, region?, url? }
    await api.post(`/films/${film.id}/availability`, {
      platformId, type: watchType, region: region || undefined, url: url || undefined
    });
    toast({ title: "Disponibilidade adicionada", duration: 1200 });
    setUrl("");
  };

  return (
    <Card>
      <CardHeader><CardTitle>Vincular a Filme</CardTitle></CardHeader>
      <CardContent className="space-y-8">
        {/* Escolha do filme */}
        <div>
          <h3 className="font-semibold mb-2">1) Escolha o filme</h3>
          <SelectFilm value={film} onChange={setFilm} />
        </div>

        {/* Gênero */}
        <div>
          <h3 className="font-semibold mb-2">2) Gêneros</h3>
          <div className="flex gap-2">
            <Select value={genreId} onValueChange={setGenreId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Selecione um gênero" /></SelectTrigger>
              <SelectContent>
                {genres.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={linkGenre} disabled={!film || !genreId}>Vincular</Button>
          </div>
        </div>

        {/* Tag */}
        <div>
          <h3 className="font-semibold mb-2">3) Tags</h3>
          <div className="flex gap-2">
            <Select value={tagId} onValueChange={setTagId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Selecione uma tag" /></SelectTrigger>
              <SelectContent>
                {tags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={linkTag} disabled={!film || !tagId}>Vincular</Button>
          </div>
        </div>

        {/* Pessoas */}
        <div>
          <h3 className="font-semibold mb-2">4) Pessoas (ator/diretor)</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a pessoa" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTOR">Ator/Atriz</SelectItem>
                <SelectItem value="DIRECTOR">Diretor(a)</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Personagem (opcional)" value={characterName} onChange={(e)=>setCharacterName(e.target.value)} />
            <Input placeholder="Ordem (1,2… opcional)" value={billingOrder} onChange={(e)=>setBillingOrder(e.target.value)} />
            <Button onClick={linkPerson} disabled={!film || !personId}>Vincular</Button>
          </div>
        </div>

        {/* Onde assistir */}
        <div>
          <h3 className="font-semibold mb-2">5) Onde assistir</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Select value={platformId} onValueChange={setPlatformId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Plataforma" /></SelectTrigger>
              <SelectContent>
                {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={watchType} onValueChange={setWatchType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WATCH_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Região (ex.: BR)" value={region} onChange={(e)=>setRegion(e.target.value)} />
            <Input placeholder="URL (opcional)" value={url} onChange={(e)=>setUrl(e.target.value)} />
            <Button onClick={linkAvailability} disabled={!film || !platformId}>Adicionar</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
