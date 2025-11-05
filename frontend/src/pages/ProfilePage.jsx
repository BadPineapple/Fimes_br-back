// frontend/src/pages/ProfilePage.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Star } from "lucide-react";
import { useToast } from "../hooks/use-toast";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { id: profileUserId } = useParams();

  // No backend atual, só conseguimos garantir dados do próprio usuário (AuthContext)
  const isOwnProfile = !profileUserId || profileUserId === String(user?.id);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editData, setEditData] = React.useState({
    name: user?.name ?? "",
    description: user?.description ?? "",
    is_private: !!user?.is_private,
  });

  React.useEffect(() => {
    // sincroniza quando o user do contexto mudar (ex.: login)
    setEditData({
      name: user?.name ?? "",
      description: user?.description ?? "",
      is_private: !!user?.is_private,
    });
  }, [user?.name, user?.description, user?.is_private]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="p-8 text-center">Carregando perfil…</Card>
        </div>
      </div>
    );
  }

  if (!user && !profileUserId) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="text-center p-8">
            <CardHeader>
              <CardTitle className="text-green-800">Acesso ao Perfil</CardTitle>
              <CardDescription>Faça login para acessar seu perfil</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Use o botão “Entrar” no topo.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isOwnProfile) {
    // Sem endpoints públicos de usuário no back atual, mostramos aviso simples
    return (
      <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="text-center p-8">
            <CardHeader>
              <CardTitle className="text-green-800">Perfil público</CardTitle>
              <CardDescription>Visualização de perfis públicos estará disponível em breve.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/films">
                <Button>Voltar aos Filmes</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentUser = user;
  const initial = (currentUser?.name?.[0] ?? "?").toUpperCase();

  const handleSave = async () => {
    // No back atual não temos rota de atualização de usuário.
    // Mantemos o UI e avisamos.
    toast({ title: "Edição de perfil estará disponível em breve.", duration: 2500 });
    setIsEditing(false);
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {/* backend atual usa avatar_url (snake_case) */}
                <AvatarImage src={currentUser?.avatar_url || currentUser?.avatarUrl || ""} alt={currentUser?.name ?? "Usuário"} />
                <AvatarFallback className="text-2xl bg-green-100 text-green-800">{initial}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      maxLength={80}
                    />
                    <Textarea
                      rows={2}
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      maxLength={240}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        id="is_private"
                        type="checkbox"
                        checked={editData.is_private}
                        onChange={(e) => setEditData({ ...editData, is_private: e.target.checked })}
                      />
                      <label htmlFor="is_private" className="text-sm">
                        Perfil privado
                      </label>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-2xl text-green-800">
                        {currentUser?.name ?? "Usuário"}
                      </CardTitle>
                      {(currentUser?.is_supporter || currentUser?.isSupporter) && (
                        <Star className="text-yellow-500 fill-yellow-500" size={24} title="Apoiador" aria-hidden="true" />
                      )}
                      {(currentUser?.is_private || currentUser?.isPrivate) && (
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">Privado</span>
                      )}
                    </div>
                    <CardDescription className="text-base mt-2">
                      {currentUser?.description || "Amante do cinema brasileiro"}
                    </CardDescription>
                  </>
                )}
              </div>
              <div className="space-x-2">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSave}>Salvar</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>Editar Perfil</Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Seções dependentes de API futura (listas, avaliações) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-800">Suas listas</CardTitle>
            <CardDescription>Favoritos, Assistidos, Quero ver — em breve.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Assim que ativarmos as rotas no backend, essas seções aparecerão aqui.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-green-800">Suas avaliações</CardTitle>
            <CardDescription>Avaliar filmes estará disponível em breve.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Em construção.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
