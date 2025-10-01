# app/services/bootstrap.py
import logging
from typing import List, Dict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.schemas.user import User as UserSchema
from app.schemas.film import Film as FilmSchema
from app.database.models import User as UserModel
from app.database.models import Film as FilmModel
from app.services.metrics import update_film_metrics


async def initialize_moderator(db: AsyncSession) -> None:
    """Garante a existência de um usuário moderador padrão."""
    email = "moderador@moderador.com"  # normalizado em minúsculas
    moderator = db.scalars(select(UserModel).where(UserModel.email == email)).first()
    if moderator:
        return

    mod_schema = UserSchema(
        email=email,
        name="Moderador Filmes.br",
        description="Administrador da plataforma Filmes.br",
        role="moderator",
    )
    moderator_model = UserModel(**mod_schema.model_dump())
    db.add(moderator_model)
    db.commit()
    logging.info("Moderador criado com sucesso")


async def initialize_sample_films(db: AsyncSession) -> None:
    """Popula o banco com alguns filmes de exemplo (se ainda não houver filmes)."""
    existing = db.execute(select(func.count(FilmModel.id))).scalar() or 0
    if existing > 0:
        return

    samples: List[Dict] = [
        {
            "title": "Cidade de Deus",
            "description": "Buscapé é um jovem pobre, negro e muito sensível...",
            "year": 2002,
            "director": "Fernando Meirelles",
            "actors": ["Alexandre Rodrigues", "Leandro Firmino", "Phellipe Haagensen", "Douglas Silva"],
            "imdb_rating": 8.6,
            "letterboxd_rating": 4.3,
            "tags": ["Drama", "Crime", "Favela", "Rio de Janeiro"],
            "watch_links": [
                {"platform": "Netflix", "url": "https://netflix.com"},
                {"platform": "Globoplay", "url": "https://globoplay.globo.com"},
            ],
        },
        {
            "title": "Tropa de Elite",
            "description": "Nascimento, capitão da Tropa de Elite do Rio de Janeiro...",
            "year": 2007,
            "director": "José Padilha",
            "actors": ["Wagner Moura", "André Ramiro", "Caio Junqueira", "Milhem Cortaz"],
            "imdb_rating": 8.0,
            "letterboxd_rating": 4.1,
            "tags": ["Ação", "Drama", "Policial", "BOPE"],
            "watch_links": [
                {"platform": "Amazon Prime", "url": "https://primevideo.com"},
                {"platform": "Telecine", "url": "https://telecine.globo.com"},
            ],
        },
        {
            "title": "Central do Brasil",
            "description": "Dora é uma ex-professora que escreve cartas...",
            "year": 1998,
            "director": "Walter Salles",
            "actors": ["Fernanda Montenegro", "Vinícius de Oliveira", "Marília Pêra", "Othon Bastos"],
            "imdb_rating": 8.0,
            "letterboxd_rating": 4.2,
            "tags": ["Drama", "Road Movie", "Sertão", "Fernanda Montenegro"],
            "watch_links": [{"platform": "Globoplay", "url": "https://globoplay.globo.com"}],
        },
        {
            "title": "O Auto da Compadecida",
            "description": "As aventuras de João Grilo e Chicó...",
            "year": 2000,
            "director": "Guel Arraes",
            "actors": ["Matheus Nachtergaele", "Selton Mello", "Rogério Cardoso", "Denise Fraga"],
            "imdb_rating": 8.7,
            "letterboxd_rating": 4.4,
            "tags": ["Comédia", "Drama", "Nordeste", "Literatura", "Ariano Suassuna"],
            "watch_links": [
                {"platform": "Globoplay", "url": "https://globoplay.globo.com"},
                {"platform": "YouTube", "url": "https://youtube.com"},
            ],
        },
        {
            "title": "Aquarius",
            "description": "Clara, uma jornalista aposentada...",
            "year": 2016,
            "director": "Kleber Mendonça Filho",
            "actors": ["Sônia Braga", "Maeve Jinkings", "Irandhir Santos", "Humberto Carrão"],
            "imdb_rating": 7.3,
            "letterboxd_rating": 4.1,
            "tags": ["Drama", "Recife", "Sônia Braga", "Resistência"],
            "watch_links": [{"platform": "MUBI", "url": "https://mubi.com"}],
        },
        {
            "title": "Bacurau",
            "description": "Bacurau, uma pequena cidade do sertão...",
            "year": 2019,
            "director": "Kleber Mendonça Filho, Juliano Dornelles",
            "actors": ["Bárbara Colen", "Thomas Aquino", "Silvero Pereira", "Thardelly Lima"],
            "imdb_rating": 7.3,
            "letterboxd_rating": 4.2,
            "tags": ["Drama", "Thriller", "Sertão", "Ficção Científica"],
            "watch_links": [
                {"platform": "Globoplay", "url": "https://globoplay.globo.com"},
                {"platform": "Amazon Prime", "url": "https://primevideo.com"},
            ],
        },
    ]

    created = 0
    for data in samples:
        film_schema = FilmSchema(**data)
        film_model = FilmModel(**film_schema.model_dump())
        db.add(film_model)
        db.commit()
        db.refresh(film_model)

        # cria/atualiza métricas iniciais (favoritos/assistidos ficarão em zero aqui)
        update_film_metrics(db, film_model.id)
        created += 1

    logging.info(f"{created} filmes de exemplo criados")
