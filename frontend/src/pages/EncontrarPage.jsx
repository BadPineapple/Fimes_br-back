// frontend/src/pages/EncontrarPage.jsx
import React from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext"; // <- corrigido
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Sparkles, User } from "lucide-react";
import LoginDialog from "../components/LoginDialog";
import { useToast } from "../hooks/use-toast";

export default function EncontrarPage() {
  const { toast } = useToast();
  const [description, setDescription] = React.useState("");
  const [recs, setRecs] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const { user } = useAuth();

  const getRecs = async () => {
    if (!user) {
      toast({ title: "Faça login para usar a IA", duration: 2500 });
      return;
    }

    const desc = description.trim();
    if (desc.length < 10) {
      toast({ title: "Descreva melhor o que você quer assistir (mín. 10 caracteres).", duration: 3000 });
      return;
    }
    if (desc.length > 500) {
      toast({ title: "Descrição muito longa (máx. 500 caracteres).", duration: 3000 });
      return;
    }

    setLoading(true);
    try {
      const r = await api.post("/ai/recommend", { description: desc });
      const data = r?.data ?? {};
      const list = Array.isArray(data.recommendations) ? data.recommendations : [];
      setRecs({
        recommendations: list,
        explanation: typeof data.explanation === "string" ? data.explanation : "",
      });
      if (!list.length) {
        toast({ title: "Nenhuma recomendação encontrada para essa descrição.", duration: 3000 });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao buscar recomendações.", duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-4">Encontrar Filmes Brasileiros</h1>
          <p className="text-green-700 text-lg">Descreva o que quer assistir e a IA recomenda.</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-yellow-500" aria-hidden="true" />
              Conte-nos o que você procura
            </CardTitle>
            <CardDescription>Ex: "Quero algo leve e engraçado"</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Descreva humor, temas, época, região, atores, etc."
            />
            <Button
              onClick={getRecs}
              disabled={loading || !user}
              className="w-full bg-green-600 hover:bg-green-700"
              aria-label="Pedir recomendações de filmes"
            >
              {loading ? (
                <>
                  <Sparkles className="mr-2 animate-spin" size={18} aria-hidden="true" />
                  Buscando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2" size={18} aria-hidden="true" />
                  Recomendar Filmes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {recs && (
          <Card data-testid="ai-recommendations">
            <CardHeader>
              <CardTitle className="text-green-800">Recomendações para Você</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Filmes Recomendados:</h3>
                {recs.recommendations?.length ? (
                  <ul className="space-y-2">
                    {recs.recommendations.map((f, i) => (
                      <li key={`${i}-${f}`} className="flex items-start gap-2">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                          {i + 1}
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">Nada por aqui ainda.</p>
                )}
              </div>

              {recs.explanation ? (
                <div>
                  <h3 className="font-semibold mb-3">Por que essas recomendações:</h3>
                  <p className="text-gray-700 leading-relaxed">{recs.explanation}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {!user && (
          <Card className="border-yellow-200 bg-yellow-50 mt-8">
            <CardContent className="pt-6 text-center">
              <User className="mx-auto mb-4 text-yellow-600" size={48} aria-hidden="true" />
              <p className="text-yellow-800 mb-4">Faça login para usar as recomendações personalizadas</p>
              <LoginDialog />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
