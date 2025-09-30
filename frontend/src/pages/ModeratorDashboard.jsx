// frontend/src/pages/ModeratorDashboard.jsx
import React from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext"; // <- corrigido
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Film, MessageSquare, Star, User } from "lucide-react";
import AddFilmForm from "../components/forms/AddFilmForm";
import { useToast } from "../hooks/use-toast";

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

  const [activeTab, setActiveTab] = React.useState("reports");

  const load = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    let mounted = true;
    try {
      const [d, r, p] = await Promise.all([
        api.get(`/moderation/dashboard?moderator_id=${user.id}`),
        api.get(`/moderation/reports?moderator_id=${user.id}`),
        api.get(`/moderation/new-profiles?moderator_id=${user.id}&days=7`),
      ]);
      if (!mounted) return;
      setDashboard(d.data ?? null);
      setReports(Array.isArray(r.data) ? r.data : []);
      setNewProfiles(Array.isArray(p.data) ? p.data : []);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar dados de moderação.", duration: 3000 });
    } finally {
      if (mounted) setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [user?.id, toast]);

  React.useEffect(() => {
    if (user?.role === "moderator") {
      load();
    } else {
      setLoading(false);
    }
  }, [user?.role, load]);

  const ask = (type, data = {}) => {
    // Para adicionar filme, apenas muda para a aba correta (não precisa de senha)
    if (type === "add_film") {
      setActiveTab("add-film");
      return;
    }
    setPending({ type, data });
    setPassword("");
    setConfirmOpen(true);
  };

  const confirm = async () => {
    // ⚠️ Senha no cliente é fraca; manter só enquanto o backend não tem roles/JWT.
    if (password !== "1357") {
      toast({ title: "Senha incorreta. Use: 1357", duration: 2500 });
      return;
    }
    try {
      if (pending?.type === "resolve_report") {
        await api.post(
          `/moderation/reports/${pending.data.reportId}/resolve?moderator_id=${user.id}`,
          { action: pending.data.action, password }
        );
        await load();
        toast({ title: "Denúncia resolvida!", duration: 2000 });
      } else if (pending?.type === "mark_supporter") {
        await api.post(`/moderation/mark-supporter?moderator_id=${user.id}`, {
          user_id: pending.data.userId,
          action_type: "mark_supporter",
          password,
        });
        await load();
        toast({ title: "Usuário marcado como apoiador!", duration: 2000 });
      } else {
        // tipo desconhecido
        toast({ title: "Ação desconhecida.", duration: 2500 });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao executar ação.", duration: 3000 });
    } finally {
      setConfirmOpen(false);
      setPending(null);
    }
  };

  if (!user || user.role !== "moderator") {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h1 className="text-2xl font-bold text-red-800 mb-4">Acesso Negado</h1>
            <p className="text-red-600">Apenas moderadores podem acessar este dashboard.</p>
            <p className="text-sm text-gray-600 mt-2">Use o email: Moderador@Moderador.com</p>
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
          <TabsList>
            <TabsTrigger value="reports">Denúncias ({reports.length})</TabsTrigger>
            <TabsTrigger value="profiles">Novos Perfis</TabsTrigger>
            <TabsTrigger value="metrics">Métricas de Filmes</TabsTrigger>
            <TabsTrigger value="add-film">Adicionar Filme</TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-800">Gerenciar Denúncias</CardTitle>
              </CardHeader>
              <CardContent>
                {reports.length ? (
                  <div className="space-y-4">
                    {reports.map((r) => (
                      <div key={r.id} className="border p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <Badge variant="outline" className="mb-2">
                              {r.reason}
                            </Badge>
                            <p className="text-sm text-gray-600">Denunciado por: {r.reporter_name}</p>
                            <p className="text-sm text-gray-500">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : ""}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => ask("resolve_report", { reportId: r.id, action: "dismiss" })}
                            >
                              Dispensar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => ask("resolve_report", { reportId: r.id, action: "delete_comment" })}
                            >
                              Excluir Comentário
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-600"
                              onClick={() => ask("resolve_report", { reportId: r.id, action: "ban_user" })}
                            >
                              Banir Usuário
                            </Button>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm font-medium">Comentário denunciado:</p>
                          <p className="text-sm text-gray-700 mt-1">"{r.comment_text}"</p>
                        </div>
                        {r.description && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Descrição:</p>
                            <p className="text-sm text-gray-600">{r.description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare size={48} className="mx-auto mb-4" aria-hidden="true" />
                    <p>Nenhuma denúncia pendente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profiles">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-800">Novos Perfis (7 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                {newProfiles.length ? (
                  <div className="space-y-4">
                    {newProfiles.map((p) => {
                      const initial = (p?.name?.[0] ?? "?").toUpperCase();
                      return (
                        <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <Avatar>
                              <AvatarImage src={p.avatar_url} alt={p.name ?? "Usuário"} />
                              <AvatarFallback>{initial}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">{p.name ?? "Usuário"}</h3>
                              <p className="text-sm text-gray-600">{p.email ?? ""}</p>
                              <p className="text-xs text-gray-500">
                                Criado em: {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : ""}
                              </p>
                              {p.is_supporter && (
                                <Badge className="mt-1 bg-yellow-100 text-yellow-800">
                                  <Star size={12} className="mr-1" aria-hidden="true" />
                                  Apoiador
                                </Badge>
                              )}
                            </div>
                          </div>
                          {!p.is_supporter && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-yellow-600 border-yellow-300"
                              onClick={() => ask("mark_supporter", { userId: p.id })}
                            >
                              <Star size={16} className="mr-1" aria-hidden="true" />
                              Marcar como Apoiador
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <User size={48} className="mx-auto mb-4" aria-hidden="true" />
                    <p>Nenhum perfil novo</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <p className="text-sm text-gray-500">Métricas aparecem aqui (placeholder).</p>
          </TabsContent>

          <TabsContent value="add-film">
            <AddFilmForm onSuccess={() => toast({ title: "Filme adicionado!", duration: 2000 })} />
          </TabsContent>
        </Tabs>

        {/* Dialog de confirmação para ações moderadas */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Ação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Digite a senha de moderador (1357):</p>
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
