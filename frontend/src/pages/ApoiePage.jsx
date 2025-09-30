// frontend/src/pages/ApoiePage.jsx
import React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Film, Star } from "lucide-react";

const APOIASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APOIASE_URL) ||
  "https://apoia.se/filmesbr";

export default function ApoiePage() {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-800 mb-4">
            Apoie o Cinema Brasileiro
          </h1>
          <p className="text-xl text-green-700 mb-6">
            Juntos, fortalecemos nossa indústria cinematográfica nacional
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <Film className="text-yellow-600" aria-hidden="true" />
                Nossa Missão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                O <strong>Filmes.br</strong> promove e valoriza o cinema brasileiro.
              </p>
              <p className="text-gray-700">
                De Cinema Novo às produções atuais, cada filme merece ser visto e preservado.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <Star className="text-yellow-600" aria-hidden="true" />
                Por que Apoiar?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-3">
                <li className="flex gap-2">
                  <span className="text-green-600" aria-hidden="true">✓</span>
                  <span>Manter a plataforma gratuita</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600" aria-hidden="true">✓</span>
                  <span>Expandir o banco de dados</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600" aria-hidden="true">✓</span>
                  <span>Desenvolver novas funcionalidades</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-r from-green-600 to-yellow-600 text-white mb-8">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Faça Parte Dessa História</h2>
            <p className="text-lg mb-6 opacity-90">
              Sua contribuição mantém viva a memória do nosso cinema.
            </p>
            <Button
              size="lg"
              className="bg-white text-green-700 hover:bg-gray-100 font-bold px-8"
              asChild
            >
              <a
                href={APOIASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Apoiar o projeto no Apoia.se (abre em nova aba)"
              >
                <Star className="mr-2" size={20} aria-hidden="true" />
                Apoiar no Apoia.se
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
