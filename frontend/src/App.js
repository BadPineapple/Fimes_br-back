import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import axios from 'axios';

// UI Components
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Textarea } from './components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Star, Search, MessageSquare, Film, Sparkles, User, Home } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email) => {
    try {
      const response = await axios.post(`${API}/auth/login?email=${email}`);
      setUser(response.data);
      localStorage.setItem('userId', response.data.id);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userId');
  };

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      axios.get(`${API}/auth/me?user_id=${userId}`)
        .then(response => setUser(response.data))
        .catch(() => localStorage.removeItem('userId'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Navigation Component
const Navigation = () => {
  const { user, logout } = React.useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <nav className="bg-gradient-to-r from-yellow-600 via-green-700 to-blue-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-bold text-white">
              Filmes.br
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link to="/" className="text-white hover:text-yellow-200 flex items-center gap-2">
                <Home size={18} />
                Início
              </Link>
              <Link to="/films" className="text-white hover:text-yellow-200 flex items-center gap-2">
                <Film size={18} />
                Todos os Filmes
              </Link>
              <Link to="/ai-recommendations" className="text-white hover:text-yellow-200 flex items-center gap-2">
                <Sparkles size={18} />
                IA Recomenda
              </Link>
              {user && (
                <Link to="/profile" className="text-white hover:text-yellow-200 flex items-center gap-2">
                  <User size={18} />
                  Perfil
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-white">Olá, {user.name}</span>
                <Avatar>
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <Button variant="outline" onClick={logout}>
                  Sair
                </Button>
              </>
            ) : (
              <LoginDialog />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Login Dialog Component
const LoginDialog = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = React.useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email);
      setOpen(false);
      setEmail('');
    } catch (error) {
      console.error('Login failed:', error);
    }
    setLoading(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} data-testid="login-button">
        <User size={18} className="mr-2" />
        Entrar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrar no Filmes.br</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="email-input"
            />
            <Button type="submit" disabled={loading} className="w-full" data-testid="login-submit">
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Home Page Component
const HomePage = () => {
  const [featuredFilms, setFeaturedFilms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedFilms = async () => {
      try {
        const response = await axios.get(`${API}/films/featured`);
        setFeaturedFilms(response.data);
      } catch (error) {
        console.error('Error fetching featured films:', error);
      }
      setLoading(false);
    };

    fetchFeaturedFilms();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl text-green-800">Carregando filmes brasileiros...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
      {/* Hero Section */}
      <section className="relative h-96 bg-gradient-to-r from-green-800 via-yellow-600 to-blue-800 text-white">
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative max-w-7xl mx-auto px-4 h-full flex items-center">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold" data-testid="hero-title">
              Descubra o Melhor do Cinema Brasileiro
            </h1>
            <p className="text-xl max-w-2xl">
              De clássicos atemporais às mais recentes produções nacionais, 
              explore nossa curadoria especial do cinema nacional.
            </p>
            <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black" data-testid="explore-button">
              Explorar Filmes
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Films Grid */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-green-800 mb-8" data-testid="featured-section-title">
            Filmes em Destaque
          </h2>
          {featuredFilms.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {featuredFilms.map((film) => (
                <FilmCard key={film.id} film={film} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Film size={64} className="mx-auto text-green-600 mb-4" />
              <p className="text-green-700 text-lg">
                Nenhum filme encontrado. Que tal adicionar alguns filmes brasileiros incríveis?
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// Film Card Component
const FilmCard = ({ film }) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" data-testid={`film-card-${film.id}`}>
      <div className="aspect-[2/3] bg-gradient-to-br from-green-200 to-yellow-200 relative">
        {film.banner_url ? (
          <img 
            src={film.banner_url} 
            alt={film.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={48} className="text-green-600" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2" data-testid="film-title">
          {film.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          {film.year && <span>{film.year}</span>}
          {film.imdb_rating && (
            <div className="flex items-center gap-1">
              <Star size={12} className="text-yellow-500" />
              <span>{film.imdb_rating}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {film.tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Films Page Component
const FilmsPage = () => {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchFilms = async () => {
      try {
        const response = await axios.get(`${API}/films`);
        setFilms(response.data);
      } catch (error) {
        console.error('Error fetching films:', error);
      }
      setLoading(false);
    };

    fetchFilms();
  }, []);

  const filteredFilms = films.filter(film =>
    film.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    film.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl text-green-800">Carregando filmografia...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-4">
            Filmografia Brasileira
          </h1>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar filmes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
        </div>

        {filteredFilms.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {filteredFilms.map((film) => (
              <FilmCard key={film.id} film={film} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Film size={64} className="mx-auto text-green-600 mb-4" />
            <p className="text-green-700 text-lg">
              {searchTerm ? `Nenhum filme encontrado para "${searchTerm}"` : 'Nenhum filme encontrado'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// AI Recommendations Page
const AIRecommendationsPage = () => {
  const [description, setDescription] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = React.useContext(AuthContext);

  const handleGetRecommendations = async () => {
    if (!user) {
      alert('Por favor, faça login para usar as recomendações da IA');
      return;
    }

    if (!description.trim()) {
      alert('Por favor, descreva o que você gostaria de assistir');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/recommend`, {
        description: description
      });
      setRecommendations(response.data);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      alert('Erro ao buscar recomendações. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-4">
            IA Recomenda Filmes Brasileiros
          </h1>
          <p className="text-green-700 text-lg">
            Descreva o que você está com vontade de assistir e nossa IA irá recomendar filmes brasileiros perfeitos para você!
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-yellow-500" />
              Conte-nos o que você procura
            </CardTitle>
            <CardDescription>
              Exemplo: "Quero algo leve e engraçado", "Busco um drama intenso", "Filmes sobre o sertão"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Descreva que tipo de filme você gostaria de assistir..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              data-testid="ai-description-input"
            />
            <Button 
              onClick={handleGetRecommendations}
              disabled={loading || !user}
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid="get-recommendations-button"
            >
              {loading ? (
                <>
                  <Sparkles className="animate-spin mr-2" size={18} />
                  Buscando recomendações...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2" size={18} />
                  Recomendar Filmes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {recommendations && (
          <Card data-testid="ai-recommendations">
            <CardHeader>
              <CardTitle className="text-green-800">
                Recomendações para Você
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Filmes Recomendados:</h3>
                <ul className="space-y-2">
                  {recommendations.recommendations.map((film, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                        {index + 1}
                      </span>
                      <span>{film}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {recommendations.explanation && (
                <div>
                  <h3 className="font-semibold mb-3">Por que essas recomendações:</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {recommendations.explanation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!user && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <User className="mx-auto mb-4 text-yellow-600" size={48} />
                <p className="text-yellow-800 mb-4">
                  Faça login para usar as recomendações personalizadas da IA
                </p>
                <LoginDialog />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// User Profile Page
const ProfilePage = () => {
  const { user } = React.useContext(AuthContext);
  const [userRatings, setUserRatings] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (user) {
      setEditData({ name: user.name, description: user.description || '' });
      fetchUserRatings();
    }
  }, [user]);

  const fetchUserRatings = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API}/users/${user.id}/ratings`);
      setUserRatings(response.data);
    } catch (error) {
      console.error('Error fetching user ratings:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await axios.put(`${API}/users/${user.id}`, editData);
      setIsEditing(false);
      window.location.reload(); // Refresh to get updated user data
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleTestLogin = async () => {
    try {
      const response = await axios.get(`${API}/auth/test-user`);
      localStorage.setItem('userId', response.data.id);
      window.location.reload();
    } catch (error) {
      console.error('Error with test login:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="text-center p-8">
            <CardHeader>
              <CardTitle className="text-green-800">Acesso ao Perfil</CardTitle>
              <CardDescription>
                Faça login para acessar seu perfil ou use o usuário de teste
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LoginDialog />
              <div className="text-sm text-gray-600">ou</div>
              <Button 
                variant="outline" 
                onClick={handleTestLogin}
                data-testid="test-login-button"
              >
                Entrar como Usuário de Teste
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="text-2xl bg-green-100 text-green-800">
                  {user.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                      placeholder="Nome"
                    />
                    <Textarea
                      value={editData.description}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      placeholder="Descrição do perfil..."
                      rows={2}
                    />
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-2xl text-green-800">{user.name}</CardTitle>
                    <CardDescription className="text-base mt-2">
                      {user.description || 'Amante do cinema brasileiro'}
                    </CardDescription>
                  </>
                )}
              </div>
              <div className="space-x-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveProfile} size="sm">Salvar</Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} size="sm">
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    Editar Perfil
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* User Ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-800">Minhas Avaliações</CardTitle>
            <CardDescription>
              Filmes que você avaliou ({userRatings.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userRatings.length > 0 ? (
              <div className="space-y-4">
                {userRatings.map((rating) => (
                  <div key={rating.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold">{rating.film_title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={16} 
                              className={`${
                                i < rating.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {rating.rating}/5 estrelas
                        </span>
                      </div>
                      {rating.comment && (
                        <p className="text-sm text-gray-700 mt-2">"{rating.comment}"</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {rating.film_year}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Film size={48} className="mx-auto mb-4" />
                <p>Você ainda não avaliou nenhum filme</p>
                <p className="text-sm">Que tal começar avaliando alguns clássicos do cinema brasileiro?</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Film Detail Page
const FilmDetailPage = () => {
  const { id } = useParams();
  const { user } = React.useContext(AuthContext);
  const [film, setFilm] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [averageRating, setAverageRating] = useState({ average: 0, count: 0 });
  const [userRating, setUserRating] = useState({ rating: 0, comment: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFilmData();
  }, [id]);

  const fetchFilmData = async () => {
    try {
      const [filmRes, ratingsRes, avgRes] = await Promise.all([
        axios.get(`${API}/films/${id}`),
        axios.get(`${API}/films/${id}/ratings`),
        axios.get(`${API}/films/${id}/average-rating`)
      ]);
      
      setFilm(filmRes.data);
      setRatings(ratingsRes.data);
      setAverageRating(avgRes.data);
      
      // Check if current user has rated this film
      if (user) {
        const existingRating = ratingsRes.data.find(r => r.user_id === user.id);
        if (existingRating) {
          setUserRating({ 
            rating: existingRating.rating, 
            comment: existingRating.comment || '' 
          });
        }
      }
    } catch (error) {
      console.error('Error fetching film data:', error);
    }
    setLoading(false);
  };

  const handleRatingSubmit = async () => {
    if (!user || userRating.rating === 0) return;
    
    try {
      await axios.post(
        `${API}/films/${id}/ratings?user_id=${user.id}`,
        {
          film_id: id,
          rating: userRating.rating,
          comment: userRating.comment
        }
      );
      fetchFilmData(); // Refresh ratings
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl text-green-800">Carregando filme...</div>
        </div>
      </div>
    );
  }

  if (!film) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center p-8">
            <CardContent>
              <Film size={64} className="mx-auto mb-4 text-green-600" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Filme não encontrado</h2>
              <p className="text-green-700 mb-4">O filme que você procura não existe ou foi removido.</p>
              <Link to="/films">
                <Button>Voltar aos Filmes</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Film Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <div className="aspect-[2/3] bg-gradient-to-br from-green-200 to-yellow-200 rounded-lg flex items-center justify-center">
              {film.banner_url ? (
                <img 
                  src={film.banner_url} 
                  alt={film.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Film size={96} className="text-green-600" />
              )}
            </div>
          </div>
          
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-green-800 mb-2">{film.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
                {film.year && <span className="font-semibold">{film.year}</span>}
                {film.director && <span>Direção: {film.director}</span>}
              </div>
              
              <div className="flex items-center space-x-6 mb-4">
                {film.imdb_rating && (
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">IMDB:</span>
                    <div className="flex items-center">
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                      <span>{film.imdb_rating}/10</span>
                    </div>
                  </div>
                )}
                
                {film.letterboxd_rating && (
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Letterboxd:</span>
                    <div className="flex items-center">
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                      <span>{film.letterboxd_rating}/5</span>
                    </div>
                  </div>
                )}
                
                {averageRating.count > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Comunidade:</span>
                    <div className="flex items-center">
                      <Star size={16} className="text-green-500 fill-green-500" />
                      <span>{averageRating.average}/5</span>
                      <span className="text-sm text-gray-500">({averageRating.count} votos)</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {film.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Sinopse</h3>
              <p className="text-gray-700 leading-relaxed">{film.description}</p>
            </div>
            
            {film.watch_links && film.watch_links.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-3">Onde Assistir</h3>
                <div className="flex flex-wrap gap-3">
                  {film.watch_links.map((link, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="border-green-600 text-green-700 hover:bg-green-50"
                      asChild
                    >
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.platform}
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Rating Section */}
          {user && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-800">Sua Avaliação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nota (1-5 estrelas):</label>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={24}
                        className={`cursor-pointer ${
                          star <= userRating.rating 
                            ? 'text-yellow-400 fill-yellow-400' 
                            : 'text-gray-300 hover:text-yellow-300'
                        }`}
                        onClick={() => setUserRating({...userRating, rating: star})}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Comentário (opcional):</label>
                  <Textarea
                    value={userRating.comment}
                    onChange={(e) => setUserRating({...userRating, comment: e.target.value})}
                    placeholder="O que você achou do filme?"
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={handleRatingSubmit}
                  disabled={userRating.rating === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Salvar Avaliação
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Community Ratings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-800">
                Avaliações da Comunidade ({ratings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ratings.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {ratings.map((rating) => (
                    <div key={rating.id} className="border-b border-gray-200 pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={rating.user_avatar} />
                            <AvatarFallback>{rating.user_name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{rating.user_name}</span>
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={14} 
                              className={`${
                                i < rating.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {rating.comment && (
                        <p className="text-gray-700 text-sm">{rating.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare size={48} className="mx-auto mb-4" />
                  <p>Ainda não há avaliações para este filme</p>
                  {user && <p className="text-sm">Seja o primeiro a avaliar!</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Navigation />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/films" element={<FilmsPage />} />
            <Route path="/films/:id" element={<FilmDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/ai-recommendations" element={<AIRecommendationsPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;