import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import ManageGenresForm from "../components/forms/ManageGenresForm";
import ManageTagsForm from "../components/forms/ManageTagsForm";
import ManagePlatformsForm from "../components/forms/ManagePlatformsForm";
import ManagePeopleForm from "../components/forms/ManagePeopleForm";
import LinkFilmRelationsForm from "../components/forms/LinkFilmRelationsForm";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Film, MessageSquare, Star, User } from "lucide-react";
import AddFilmForm from "../components/forms/AddFilmForm";
import { useToast } from "../hooks/use-toast";

// Flags: desative recursos sem backend
const FEATURE_MODERATION = false; // /moderation/*
const MOD_PASSWORD = "1357";

export default function ModeratorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [dashboard, setDashboard] = React.useState(null);
  const [reports, setReports] = React.useState([]);
  const [newProfiles, setNewProfiles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(null);
  const [password, setPassword] = React.useState("");

  const [activeTab, setActiveTab] = React.useState("add-film");

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        if (FEATURE_MODERATION) {
          // quando existir backend de moderação, reative os fetches abaixo
          // const [d, r, p] = await Promise.all([
          //   api.get(`/moderation/dashboard?moderator_id=${user.id}`),
          //   api.get(`/moderation/reports?moderator_id=${user.id}`),
          //   api.get(`/moderation/new-profiles?moderator_id=${user.id}&days=7`),
          // ]);
          // if (!mounted) return;
          // setDashboard(d.data ?? null);
          // setReports(Array.isArray(r.data) ? r.data : []);
          // setNewProfiles(Array.isArray(p.data) ? p.data : []);
        } else {
          // placeholders amigáveis para não quebrar UI
          if (!mounted) return;
          setDashboard({ films_count: 0, pending_reports: 0, new_profiles: 0 });
          setReports([]);
          setNewProfiles([]);
        }
      } catch (e) {
        console.error(e);
        toast({ title: "Erro ao carregar dados de moderação.", duration: 3000 });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (user?.role === "moderator" || user?.role === "admin") {
      load();
    } else {
      setLoading(false);
    }

    return () => { mounted = false; };
  }, [user?.id, user?.role, toast]);

  const ask = (type, data = {}) => {
    if (type === "add_film") {
      setActiveTab("add-film");
      return;
    }
    if (!FEATURE_MODERATION) {
      toast({ title: "Módulo de moderação em breve.", duration: 2500 });
      return;
    }
    setPending({ type, data });
    setPassword("");
    setConfirmOpen(true);
  };

  const confirm = async () => {
    if (password !== MOD_PASSWORD) {
      toast({ title: "Senha incorreta. Use: 1357", duration: 2500 });
      return;
    }
    try {
      if (!FEATURE_MODERATION) {
        toast({ title: "Módulo de moderação em breve.", duration: 2500 });
        return;
      }
      // quando o backend existir, reative os posts abaixo
      // if (pending?.type === "resolve_report") { ... }
      // else if (pending?.type === "mark_supporter") { ... }
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao executar ação.", duration: 3000 });
    } finally {
      setConfirmOpen(false);
      setPending(null);
    }
  };

  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h1 className="text-2xl font-bold text-red-800 mb-4">Acesso Negado</h1>
            <p className="text-red-600">Apenas moderadores podem acessar este dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-2xl text-blue-800">Carregando dashboard...</div>
      </div>
    );
  }

  const filmsCount = dashboard?.films_count ?? 0;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Dashboard do Moderador</h1>
          <p className="text-blue-600">Bem-vindo, {user.name ?? "Moderador"}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare size={48} className="mx-auto mb-4 text-red-500" aria-hidden="true" />
              <h3 className="text-2xl font-bold text-red-600">{dashboard?.pending_reports || 0}</h3>
              <p className="text-gray-600">Denúncias Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <User size={48} className="mx-auto mb-4 text-green-500" aria-hidden="true" />
              <h3 className="text-2xl font-bold text-green-600">{dashboard?.new_profiles || 0}</h3>
              <p className="text-gray-600">Novos Perfis (30 dias)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Film size={48} className="mx-auto mb-4 text-blue-500" aria-hidden="true" />
              <h3 className="text-2xl font-bold text-blue-600">{filmsCount}</h3>
              <p className="text-gray-600">Filmes Cadastrados</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => ask("add_film")}>
            <Film className="mr-2" size={18} aria-hidden="true" />
            Adicionar Novo Filme
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="metrics">Métricas de Filmes</TabsTrigger>
            <TabsTrigger value="add-film">Adicionar Filme</TabsTrigger>
            <TabsTrigger value="genres">Gêneros</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="platforms">Plataformas</TabsTrigger>
            <TabsTrigger value="people">Pessoas</TabsTrigger>
            <TabsTrigger value="links">Vincular a Filme</TabsTrigger>

            {/* legado/moderação futura */}
            <TabsTrigger value="reports" disabled={!FEATURE_MODERATION}>
              Denúncias ({reports.length})
            </TabsTrigger>
            <TabsTrigger value="profiles" disabled={!FEATURE_MODERATION}>
              Novos Perfis
            </TabsTrigger>
          </TabsList>

          {/* Métricas */}
          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-800">Métricas de Filmes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Em breve: contagem por ano, últimos adicionados, etc.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add Film */}
          <TabsContent value="add-film">
            <AddFilmForm onSuccess={() => toast({ title: "Filme adicionado!", duration: 2000 })} />
          </TabsContent>

          {/* Gêneros */}
          <TabsContent value="genres">
            <ManageGenresForm />
          </TabsContent>

          {/* Tags */}
          <TabsContent value="tags">
            <ManageTagsForm />
          </TabsContent>

          {/* Plataformas */}
          <TabsContent value="platforms">
            <ManagePlatformsForm />
          </TabsContent>

          {/* Pessoas */}
          <TabsContent value="people">
            <ManagePeopleForm />
          </TabsContent>

          {/* Vínculos */}
          <TabsContent value="links">
            <LinkFilmRelationsForm />
          </TabsContent>

          {/* Moderation placeholders (mantidos) */}
          <TabsContent value="reports">
            <Card>
              <CardHeader><CardTitle className="text-blue-800">Gerenciar Denúncias</CardTitle></CardHeader>
              <CardContent><div className="text-sm text-gray-600">Módulo de moderação estará disponível em breve.</div></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profiles">
            <Card>
              <CardHeader><CardTitle className="text-blue-800">Novos Perfis (7 dias)</CardTitle></CardHeader>
              <CardContent><div className="text-sm text-gray-600">Módulo de moderação estará disponível em breve.</div></CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog (mantido para o futuro) */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Ação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Digite a senha de moderador ({MOD_PASSWORD}):</p>
              <Input
                type="password"
                maxLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputMode="numeric"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={confirm}>Confirmar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
