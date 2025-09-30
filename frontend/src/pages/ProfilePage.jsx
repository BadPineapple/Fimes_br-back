// frontend/src/pages/ProfilePage.jsx
import React from "react";
import api from "../services/api";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // <- corrigido
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Film, Star } from "lucide-react";
import { useToast } from "../hooks/use-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { id: profileUserId } = useParams();

  const [profileUser, setProfileUser] = React.useState(null);
  const [isOwnProfile, setIsOwnProfile] = React.useState(false);
  const [userRatings, setUserRatings] = React.useState([]);
  const [favoriteFilms, setFavoriteFilms] = React.useState([]);
  const [topRatedFilms, setTopRatedFilms] = React.useState([]);
  const [selectedList, setSelectedList] = React.useState("favorites");
  const [listFilms, setListFilms] = React.useState([]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editData, setEditData] = React.useState({ name: "", description: "", is_private: false });

  React.useEffect(() => {
    let mounted = true;
    const targetId = profileUserId || user?.id || null;
    const isOwn = !!(user && (!profileUserId || profileUserId === user.id));
    setIsOwnProfile(isOwn);
    if (!targetId) return;

    // Carrega dados do perfil
    (async () => {
      try {
        if (isOwn) {
          if (!mounted) return;
          setProfileUser(user);
          setEditData({
            name: user?.name ?? "",
            description: user?.description ?? "",
            is_private: !!user?.is_private,
          });
        } else {
          const r = await api.get(`/auth/me?user_id=${targetId}`);
          if (!mounted) return;
          setProfileUser(r.data);
        }

        // Carrega avaliações + favoritos (se próprio)
        const viewerId = user ? user.id : null;
        const [rRatings, rFav] = await Promise.all([
          api.get(`/users/${targetId}/ratings`),
          isOwn ? api.get(`/users/${targetId}/film-lists/favorites?viewer_id=${viewerId}`) : Promise.resolve({ data: [] }),
        ]);

        if (!mounted) return;

        const ratingsData = Array.isArray(rRatings.data) ? rRatings.data : [];
        setUserRatings(ratingsData);

        if (isOwn) {
          const fav = Array.isArray(rFav.data) ? rFav.data : [];
          setFavoriteFilms(fav.slice(0, 5));

          const top = [...ratingsData]
            .sort((a, b) => (b.rating - a.rating) || (new Date(b.created_at) - new Date(a.created_at)))
            .slice(0, 5);
          setTopRatedFilms(top);
        }
      } catch (e) {
        console.error(e);
        toast({ title: "Erro ao carregar perfil.", duration: 3000 });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user, profileUserId, toast]);

  React.useEffect(() => {
    if (isOwnProfile) fetchListFilms(selectedList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedList, isOwnProfile, user?.id, profileUserId]);

  const fetchListFilms = async (type) => {
    if (!isOwnProfile || !user) return;
    const targetId = profileUserId || user.id;
    try {
      const r = await api.get(`/users/${targetId}/film-lists/${type}?viewer_id=${user.id}`);
      setListFilms(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar lista.", duration: 3000 });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const payload = {
      name: (editData.name || "").trim(),
      description: (editData.description || "").trim(),
      is_private: !!editData.is_private,
    };
    if (!payload.name) {
      toast({ title: "Nome não pode ficar vazio.", duration: 2500 });
      return;
    }
    try {
      await api.put(`/users/${user.id}`, payload);
      // Atualiza estado local sem reload
      setProfileUser((prev) => (prev ? { ...prev, ...payload } : prev));
      setIsEditing(false);
      toast({ title: "Perfil atualizado!", duration: 2000 });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao salvar perfil.", duration: 3000 });
    }
  };

  const currentUser = profileUser || user;
  if (!currentUser) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="text-center p-8">
            <CardHeader>
              <CardTitle className="text-green-800">Acesso ao Perfil</CardTitle>
              <CardDescription>Faça login para acessar seu perfil</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Use o botão Entrar no topo.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const initial = (currentUser?.name?.[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentUser.avatar_url} alt={currentUser.name ?? "Usuário"} />
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
                      <CardTitle className="text-2xl text-green-800">{currentUser.name ?? "Usuário"}</CardTitle>
                      {currentUser.is_supporter && (
                        <Star className="text-yellow-500 fill-yellow-500" size={24} title="Apoiador" aria-hidden="true" />
                      )}
                      {currentUser.is_private && <span className="text-xs bg-gray-200 px-2 py-1 rounded">Privado</span>}
                    </div>
                    <CardDescription className="text-base mt-2">
                      {currentUser.description || "Amante do cinema brasileiro"}
                    </CardDescription>
                  </>
                )}
              </div>
              <div className="space-x-2">
                {isOwnProfile &&
                  (isEditing ? (
                    <>
                      <Button size="sm" onClick={handleSave}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      Editar Perfil
                    </Button>
                  ))}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* TODO: Renderizar favoritos, topRatedFilms, listFilms, e userRatings aqui,
            reaproveitando seus componentes/estilos. */}
      </div>
    </div>
  );
}
