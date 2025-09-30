// frontend/src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import ContactUsDialog from "./ContactUsDialog";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-green-800 via-yellow-600 to-blue-800 text-white py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sobre */}
          <div>
            <h3 className="text-xl font-bold mb-4">Filmes.br</h3>
            <p className="text-sm opacity-90 leading-relaxed">
              A maior plataforma de cinema brasileiro. Descubra, avalie e compartilhe sua paixão.
            </p>
          </div>

          {/* Links rápidos como navegação */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Links Rápidos</h4>
            <nav aria-label="Links rápidos" className="space-y-2 text-sm">
              <div>
                <Link to="/films" className="hover:text-yellow-100 underline-offset-2 hover:underline">
                  Todos os Filmes
                </Link>
              </div>
              <div>
                <Link to="/encontrar" className="hover:text-yellow-100 underline-offset-2 hover:underline">
                  IA Recomenda
                </Link>
              </div>
              <div>
                <Link to="/apoie" className="hover:text-yellow-100 underline-offset-2 hover:underline">
                  Apoie o Projeto
                </Link>
              </div>
              <div>
                <a
                  href="https://apoia.se/filmesbr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-yellow-100 underline-offset-2 hover:underline"
                >
                  Apoia.se
                </a>
              </div>
            </nav>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contato &amp; Suporte</h4>
            <div className="space-y-2 text-sm">
              <div className="mb-3">
                <ContactUsDialog />
              </div>
              <div>
                Email:{" "}
                <a
                  href="mailto:contato@filmes.br"
                  className="hover:text-yellow-100 underline-offset-2 hover:underline"
                >
                  contato@filmes.br
                </a>
              </div>
              <div>
                Suporte:{" "}
                <a
                  href="mailto:ajuda@filmes.br"
                  className="hover:text-yellow-100 underline-offset-2 hover:underline"
                >
                  ajuda@filmes.br
                </a>
              </div>
              <div className="pt-2">
                <p className="text-xs opacity-75">
                  Plataforma dedicada ao cinema brasileiro • Feito com ❤️
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-6 text-center text-sm opacity-75">
          <p>&copy; {year} Filmes.br — Todos os direitos reservados</p>
        </div>
      </div>
    </footer>
  );
}
