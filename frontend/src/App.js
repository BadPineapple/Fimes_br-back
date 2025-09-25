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
import { Star, Search, MessageSquare, Film, Sparkles, User, Home, Menu, X } from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/films", icon: Film, label: "Filmes" },
    { to: "/encontrar", icon: Search, label: "Encontrar" },
    { to: "/apoie", icon: Star, label: "Apoie" },
    ...(user && user.role === 'moderator' ? [{ to: "/moderator", icon: MessageSquare, label: "Dashboard", special: true }] : [])
  ];

  return (
    <>
      <nav className="bg-gradient-to-r from-yellow-600 via-green-700 to-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold text-white">
                Filmes.br
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex space-x-6">
                {navigationItems.map((item) => (
                  <Link 
                    key={item.to}
                    to={item.to} 
                    className={`text-white hover:text-yellow-200 flex items-center gap-2 ${
                      item.special ? 'bg-blue-600 px-3 py-1 rounded' : ''
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-white hover:text-yellow-200"
              >
                <Menu size={24} />
              </button>

              {/* User info - Desktop */}
              <div className="hidden md:flex items-center space-x-4">
                {user ? (
                  <>
                    <Link 
                      to="/profile" 
                      className="text-white hover:text-yellow-200 flex items-center space-x-2 cursor-pointer"
                    >
                      <span>Olá, {user.name}</span>
                      <Avatar>
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                    </Link>
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
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-yellow-600 via-green-700 to-blue-800 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-white border-opacity-20">
              <h2 className="text-xl font-bold text-white">Filmes.br</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white hover:text-yellow-200"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="py-4">
              {/* User section in sidebar */}
              <div className="px-4 pb-4 border-b border-white border-opacity-20">
                {user ? (
                  <div className="flex items-center space-x-3">
                    <Link 
                      to="/profile"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center space-x-3 hover:opacity-80"
                    >
                      <Avatar>
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-white text-green-800">{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-yellow-200 text-xs">Ver perfil</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setSidebarOpen(false);
                      }}
                      className="text-yellow-200 text-sm hover:text-yellow-100 ml-auto"
                    >
                      Sair
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <LoginDialog />
                  </div>
                )}
              </div>

              {/* Navigation links */}
              <div className="mt-4 space-y-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 text-white hover:bg-white hover:bg-opacity-10 ${
                      item.special ? 'bg-blue-600 bg-opacity-30' : ''
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Login Dialog Component
const LoginDialog = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState(0);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = React.useContext(AuthContext);

  // Generate simple math captcha
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = ['+', '-', '×'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let answer;
    let question;
    
    switch(operation) {
      case '+':
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
        break;
      case '-':
        answer = Math.max(num1, num2) - Math.min(num1, num2);
        question = `${Math.max(num1, num2)} - ${Math.min(num1, num2)}`;
        break;
      case '×':
        answer = num1 * num2;
        question = `${num1} × ${num2}`;
        break;
      default:
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
    }
    
    setCaptchaQuestion(question);
    setCaptchaAnswer(answer);
  };

  useEffect(() => {
    if (open) {
      generateCaptcha();
    }
  }, [open]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Verify captcha
    if (parseInt(captcha) !== captchaAnswer) {
      alert('Verificação incorreta. Tente novamente.');
      generateCaptcha();
      setCaptcha('');
      return;
    }
    
    setLoading(true);
    try {
      await login(email);
      setOpen(false);
      setEmail('');
      setCaptcha('');
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
            
            {/* Captcha Verification */}
            <div className="bg-gray-50 p-4 rounded-md">
              <label className="block text-sm font-medium mb-2">
                🤖 Verificação: Não sou um robô
              </label>
              <div className="flex items-center space-x-3">
                <span className="text-lg font-mono bg-white px-3 py-2 border rounded">
                  {captchaQuestion} = ?
                </span>
                <Input
                  type="number"
                  placeholder="Resultado"
                  value={captcha}
                  onChange={(e) => setCaptcha(e.target.value)}
                  className="w-20"
                  required
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={generateCaptcha}
                  title="Gerar nova pergunta"
                >
                  🔄
                </Button>
              </div>
            </div>
            
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
    <Link to={`/films/${film.id}`}>
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
    </Link>
  );
};

// Films Page Component
const FilmsPage = () => {
  const [films, setFilms] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [filmsRes, genresRes] = await Promise.all([
          axios.get(`${API}/films`),
          axios.get(`${API}/films/genres`)
        ]);
        setFilms(filmsRes.data);
        setGenres(genresRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const fetchByGenre = async (genre) => {
    if (!genre) {
      // Fetch all films
      try {
        const response = await axios.get(`${API}/films`);
        setFilms(response.data);
      } catch (error) {
        console.error('Error fetching all films:', error);
      }
    } else {
      // Fetch films by genre
      try {
        const response = await axios.get(`${API}/films/by-genre/${genre}`);
        setFilms(response.data);
      } catch (error) {
        console.error('Error fetching films by genre:', error);
      }
    }
  };

  const handleGenreChange = (genre) => {
    setSelectedGenre(genre);
    setSearchTerm(''); // Clear search when changing genre
    fetchByGenre(genre);
  };

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
          <h1 className="text-3xl font-bold text-green-800 mb-6">
            Filmografia Brasileira
          </h1>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar filmes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-green-800">Filtrar por gênero:</label>
              <select
                value={selectedGenre}
                onChange={(e) => handleGenreChange(e.target.value)}
                className="px-4 py-2 border border-green-300 rounded-md bg-white text-green-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos os gêneros</option>
                {genres.map((genre, index) => (
                  <option key={index} value={genre.genre}>
                    {genre.genre} ({genre.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {selectedGenre && (
            <div className="mb-4">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Filtrando por: {selectedGenre}
                <button 
                  onClick={() => handleGenreChange('')}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ✕
                </button>
              </Badge>
            </div>
          )}
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

// Encontrar Page (AI Recommendations)
const EncontrarPage = () => {
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
            Encontrar Filmes Brasileiros
          </h1>
          <p className="text-green-700 text-lg">
            Descreva o que você está com vontade de assistir e nossa IA irá recomendar filmes brasileiros perfeitos para você baseado nos filmes, comentários e avaliações da nossa comunidade!
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

// Add Film Form Component
const AddFilmForm = ({ user, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    banner_url: '',
    description: '',
    year: '',
    director: '',
    actors: '',
    imdb_rating: '',
    letterboxd_rating: '',
    tags: '',
    watch_links: [{ platform: '', url: '' }]
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    if (password !== '1357') {
      alert('Senha incorreta! Use: 1357');
      return;
    }

    try {
      const submitData = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
        imdb_rating: formData.imdb_rating ? parseFloat(formData.imdb_rating) : null,
        letterboxd_rating: formData.letterboxd_rating ? parseFloat(formData.letterboxd_rating) : null,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        actors: formData.actors.split(',').map(actor => actor.trim()).filter(actor => actor),
        watch_links: formData.watch_links.filter(link => link.platform && link.url)
      };

      await axios.post(`${API}/films`, submitData);
      onSuccess();
      
      // Reset form
      setFormData({
        title: '',
        banner_url: '',
        description: '',
        year: '',
        director: '',
        actors: '',
        imdb_rating: '',
        letterboxd_rating: '',
        tags: '',
        watch_links: [{ platform: '', url: '' }]
      });
      setShowConfirm(false);
      setPassword('');
      
    } catch (error) {
      console.error('Error adding film:', error);
      alert('Erro ao adicionar filme: ' + (error.response?.data?.detail || 'Erro desconhecido'));
    }
  };

  const addWatchLink = () => {
    setFormData({
      ...formData,
      watch_links: [...formData.watch_links, { platform: '', url: '' }]
    });
  };

  const updateWatchLink = (index, field, value) => {
    const newLinks = [...formData.watch_links];
    newLinks[index][field] = value;
    setFormData({ ...formData, watch_links: newLinks });
  };

  const removeWatchLink = (index) => {
    const newLinks = formData.watch_links.filter((_, i) => i !== index);
    setFormData({ ...formData, watch_links: newLinks });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-blue-800">Adicionar Novo Filme Brasileiro</CardTitle>
        <CardDescription>Preencha as informações do filme para adicionar ao catálogo</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Título *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Cidade de Deus"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Diretor</label>
                <Input
                  value={formData.director}
                  onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                  placeholder="Ex: Fernando Meirelles"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ano</label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="Ex: 2002"
                  min="1900"
                  max="2030"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">URL da Capa</label>
                <Input
                  value={formData.banner_url}
                  onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                  placeholder="https://exemplo.com/capa.jpg"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">IMDB Rating (0-10)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.imdb_rating}
                  onChange={(e) => setFormData({ ...formData, imdb_rating: e.target.value })}
                  placeholder="Ex: 8.6"
                  min="0"
                  max="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Letterboxd Rating (0-5)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.letterboxd_rating}
                  onChange={(e) => setFormData({ ...formData, letterboxd_rating: e.target.value })}
                  placeholder="Ex: 4.3"
                  min="0"
                  max="5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags/Gêneros</label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Drama, Crime, Favela, Rio de Janeiro (separar por vírgula)"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sinopse *</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o enredo do filme..."
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Onde Assistir</label>
            {formData.watch_links.map((link, index) => (
              <div key={index} className="flex space-x-2 mb-2">
                <Input
                  placeholder="Plataforma (ex: Netflix)"
                  value={link.platform}
                  onChange={(e) => updateWatchLink(index, 'platform', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => updateWatchLink(index, 'url', e.target.value)}
                  className="flex-1"
                />
                {formData.watch_links.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeWatchLink(index)}
                    className="px-3"
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addWatchLink}
              className="mt-2"
            >
              + Adicionar Link
            </Button>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            Adicionar Filme ao Catálogo
          </Button>
        </form>

        {/* Confirmação */}
        {showConfirm && (
          <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Adição de Filme</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>Digite a senha de moderador para adicionar o filme:</p>
                <Input
                  type="password"
                  placeholder="Digite: 1357"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={4}
                />
                <div className="flex space-x-2 justify-end">
                  <Button variant="outline" onClick={() => setShowConfirm(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={confirmSubmit}>
                    Adicionar Filme
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

// Moderator Dashboard Page
const ModeratorDashboard = () => {
  const { user } = React.useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [reports, setReports] = useState([]);
  const [newProfiles, setNewProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user && user.role === 'moderator') {
      fetchDashboardData();
      fetchReports();
      fetchNewProfiles();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/moderation/dashboard?moderator_id=${user.id}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API}/moderation/reports?moderator_id=${user.id}`);
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchNewProfiles = async () => {
    try {
      const response = await axios.get(`${API}/moderation/new-profiles?moderator_id=${user.id}&days=7`);
      setNewProfiles(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching new profiles:', error);
      setLoading(false);
    }
  };

  const handleAction = (actionType, data = {}) => {
    setPendingAction({ type: actionType, data });
    setShowConfirmDialog(true);
    setPassword('');
  };

  const confirmAction = async () => {
    if (password !== '1357') {
      alert('Senha incorreta! Use: 1357');
      return;
    }

    try {
      if (pendingAction.type === 'resolve_report') {
        await axios.post(`${API}/moderation/reports/${pendingAction.data.reportId}/resolve?moderator_id=${user.id}`, {
          action: pendingAction.data.action,
          password: password
        });
        fetchReports();
        alert('Denúncia resolvida com sucesso!');
      } else if (pendingAction.type === 'mark_supporter') {
        await axios.post(`${API}/moderation/mark-supporter?moderator_id=${user.id}`, {
          user_id: pendingAction.data.userId,
          action_type: 'mark_supporter',
          password: password
        });
        fetchNewProfiles();
        alert('Usuário marcado como apoiador!');
      }
    } catch (error) {
      console.error('Error executing action:', error);
      alert('Erro ao executar ação: ' + (error.response?.data?.detail || 'Erro desconhecido'));
    }

    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  if (!user || user.role !== 'moderator') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h1 className="text-2xl font-bold text-red-800 mb-4">Acesso Negado</h1>
            <p className="text-red-600">Apenas moderadores podem acessar este dashboard.</p>
            <p className="text-sm text-gray-600 mt-2">
              Use o email: Moderador@Moderador.com para fazer login como moderador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl text-blue-800">Carregando dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Dashboard do Moderador</h1>
          <p className="text-blue-600">Bem-vindo, {user.name}</p>
        </div>

        {/* Métricas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare size={48} className="mx-auto mb-4 text-red-500" />
              <h3 className="text-2xl font-bold text-red-600">{dashboardData?.pending_reports || 0}</h3>
              <p className="text-gray-600">Denúncias Pendentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <User size={48} className="mx-auto mb-4 text-green-500" />
              <h3 className="text-2xl font-bold text-green-600">{dashboardData?.new_profiles || 0}</h3>
              <p className="text-gray-600">Novos Perfis (30 dias)</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Film size={48} className="mx-auto mb-4 text-blue-500" />
              <h3 className="text-2xl font-bold text-blue-600">6</h3>
              <p className="text-gray-600">Filmes Cadastrados</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleAction('add_film')}
          >
            <Film className="mr-2" size={18} />
            Adicionar Novo Filme
          </Button>
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList>
            <TabsTrigger value="reports">Denúncias ({reports.length})</TabsTrigger>
            <TabsTrigger value="profiles">Novos Perfis</TabsTrigger>
            <TabsTrigger value="metrics">Métricas de Filmes</TabsTrigger>
            <TabsTrigger value="add-film">Adicionar Filme</TabsTrigger>
          </TabsList>

          {/* Denúncias */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-800">Gerenciar Denúncias</CardTitle>
              </CardHeader>
              <CardContent>
                {reports.length > 0 ? (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="border border-gray-200 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <Badge variant="outline" className="mb-2">{report.reason}</Badge>
                            <p className="text-sm text-gray-600">
                              Denunciado por: {report.reporter_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(report.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAction('resolve_report', { reportId: report.id, action: 'dismiss' })}
                            >
                              Dispensar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleAction('resolve_report', { reportId: report.id, action: 'delete_comment' })}
                            >
                              Excluir Comentário
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-red-600"
                              onClick={() => handleAction('resolve_report', { reportId: report.id, action: 'ban_user' })}
                            >
                              Banir Usuário
                            </Button>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm font-medium">Comentário denunciado:</p>
                          <p className="text-sm text-gray-700 mt-1">"{report.comment_text}"</p>
                        </div>
                        {report.description && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Descrição da denúncia:</p>
                            <p className="text-sm text-gray-600">{report.description}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare size={48} className="mx-auto mb-4" />
                    <p>Nenhuma denúncia pendente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Novos Perfis */}
          <TabsContent value="profiles">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-800">Novos Perfis (Últimos 7 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                {newProfiles.length > 0 ? (
                  <div className="space-y-4">
                    {newProfiles.map((profile) => (
                      <div key={profile.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback>{profile.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{profile.name}</h3>
                            <p className="text-sm text-gray-600">{profile.email}</p>
                            <p className="text-xs text-gray-500">
                              Criado em: {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                            </p>
                            {profile.is_supporter && (
                              <Badge className="mt-1 bg-yellow-100 text-yellow-800">
                                <Star size={12} className="mr-1" />
                                Apoiador
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="space-x-2">
                          {!profile.is_supporter && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-yellow-600 border-yellow-300"
                              onClick={() => handleAction('mark_supporter', { userId: profile.id })}
                            >
                              <Star size={16} className="mr-1" />
                              Marcar como Apoiador
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <User size={48} className="mx-auto mb-4" />
                    <p>Nenhum perfil novo nos últimos 7 dias</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Métricas de Filmes */}
          <TabsContent value="metrics">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-800 text-sm">Melhores Avaliações</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.top_rated_films?.length > 0 ? (
                    <div className="space-y-2">
                      {dashboardData.top_rated_films.map((item, index) => (
                        <div key={index} className="text-sm">
                          <p className="font-medium">{item.film.title}</p>
                          <p className="text-gray-600">⭐ {item.metrics.average_rating}/5 ({item.metrics.ratings_count} votos)</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Sem dados ainda</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-800 text-sm">Mais Favoritados</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.top_favorite_films?.length > 0 ? (
                    <div className="space-y-2">
                      {dashboardData.top_favorite_films.map((item, index) => (
                        <div key={index} className="text-sm">
                          <p className="font-medium">{item.film.title}</p>
                          <p className="text-gray-600">❤️ {item.metrics.favorites_count} favoritos</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Sem dados ainda</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-800 text-sm">Mais Assistidos</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.top_watched_films?.length > 0 ? (
                    <div className="space-y-2">
                      {dashboardData.top_watched_films.map((item, index) => (
                        <div key={index} className="text-sm">
                          <p className="font-medium">{item.film.title}</p>
                          <p className="text-gray-600">👁️ {item.metrics.watched_count} assistidos</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Sem dados ainda</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Adicionar Filme */}
          <TabsContent value="add-film">
            <AddFilmForm user={user} onSuccess={() => alert('Filme adicionado com sucesso!')} />
          </TabsContent>
        </Tabs>

        {/* Dialog de Confirmação */}
        {showConfirmDialog && (
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Ação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>Para confirmar esta ação, digite a senha de moderador:</p>
                <Input
                  type="password"
                  placeholder="Digite: 1357"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={4}
                />
                <div className="flex space-x-2 justify-end">
                  <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={confirmAction}>
                    Confirmar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

// Apoie Page
const ApoiePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 py-8">
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
                <Film className="text-yellow-600" />
                Nossa Missão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                O <strong>Filmes.br</strong> é uma plataforma dedicada a promover e valorizar o cinema brasileiro. 
                Nossa missão é criar uma comunidade onde cinéfilos possam descobrir, avaliar e discutir 
                as obras nacionais que fazem parte da nossa rica cultura cinematográfica.
              </p>
              <p className="text-gray-700">
                Desde os clássicos do Cinema Novo até as produções contemporâneas, acreditamos que 
                cada filme brasileiro merece ser visto, discutido e preservado para as futuras gerações.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <Star className="text-yellow-600" />
                Por que Apoiar?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700">Manter a plataforma gratuita e acessível para todos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700">Expandir nosso banco de dados com mais filmes nacionais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700">Desenvolver novas funcionalidades para a comunidade</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700">Promover eventos e iniciativas culturais</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Banner Apoia-se */}
        <Card className="bg-gradient-to-r from-green-600 to-yellow-600 text-white mb-8">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Faça Parte Dessa História
            </h2>
            <p className="text-lg mb-6 opacity-90">
              Sua contribuição nos ajuda a manter viva a memória do cinema brasileiro 
              e a descobrir novos talentos da nossa cinematografia.
            </p>
            <Button 
              size="lg" 
              className="bg-white text-green-700 hover:bg-gray-100 font-bold px-8"
              asChild
            >
              <a 
                href="https://apoia.se/filmesbr" 
                target="_blank" 
                rel="noopener noreferrer"
                data-testid="support-button"
              >
                <Star className="mr-2" size={20} />
                Apoiar no Apoia.se
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-green-800 text-center">
              A Importância do Cinema Nacional
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-green max-w-none">
            <p className="text-gray-700 leading-relaxed mb-4">
              O cinema brasileiro é um espelho da nossa sociedade, retratando nossas histórias, 
              culturas regionais e diversidade social. Desde "Limite" de Mário Peixoto (1931) 
              até as produções contemporâneas de diretores como Kleber Mendonça Filho e Anna Muylaert, 
              nosso cinema evoluiu e ganhou reconhecimento internacional.
            </p>
            
            <p className="text-gray-700 leading-relaxed mb-4">
              Filmes como <em>"Central do Brasil"</em>, <em>"Cidade de Deus"</em>, e <em>"O Auto da Compadecida"</em> 
              não são apenas entretenimento - são patrimônio cultural que preserva nossa identidade 
              e nos conecta com nossas raízes.
            </p>
            
            <p className="text-gray-700 leading-relaxed">
              Ao apoiar o <strong>Filmes.br</strong>, você está investindo na preservação e promoção 
              deste patrimônio cultural inestimável, garantindo que as futuras gerações tenham 
              acesso às obras que definem quem somos como povo e como nação.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// User Profile Page
const ProfilePage = () => {
  const { user } = React.useContext(AuthContext);
  const { id: profileUserId } = useParams(); // Para acessar perfil de outros usuários
  const [profileUser, setProfileUser] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [userRatings, setUserRatings] = useState([]);
  const [favoriteFilms, setFavoriteFilms] = useState([]);
  const [topRatedFilms, setTopRatedFilms] = useState([]);
  const [selectedList, setSelectedList] = useState('favorites');
  const [listFilms, setListFilms] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ 
    name: '', 
    description: '', 
    is_private: false 
  });

  useEffect(() => {
    const targetUserId = profileUserId || (user ? user.id : null);
    const isOwn = user && (!profileUserId || profileUserId === user.id);
    
    setIsOwnProfile(isOwn);
    
    if (targetUserId) {
      if (isOwn) {
        setProfileUser(user);
        setEditData({ 
          name: user.name, 
          description: user.description || '',
          is_private: user.is_private || false
        });
      } else {
        // Fetch other user's profile
        fetchOtherUserProfile(targetUserId);
      }
      fetchUserData(targetUserId, isOwn);
    }
  }, [user, profileUserId]);

  const fetchOtherUserProfile = async (userId) => {
    try {
      const response = await axios.get(`${API}/auth/me?user_id=${userId}`);
      setProfileUser(response.data);
    } catch (error) {
      console.error('Error fetching other user profile:', error);
    }
  };

  const fetchUserData = async (targetUserId, isOwn) => {
    if (!targetUserId) return;
    try {
      const viewerId = user ? user.id : null;
      const [ratingsRes, favoritesRes] = await Promise.all([
        axios.get(`${API}/users/${targetUserId}/ratings`),
        isOwn ? axios.get(`${API}/users/${targetUserId}/film-lists/favorites?viewer_id=${viewerId}`) : Promise.resolve({data: []})
      ]);
      
      setUserRatings(ratingsRes.data);
      
      if (isOwn) {
        setFavoriteFilms(favoritesRes.data.slice(0, 5));
        
        // Get top 5 highest rated films by this user (only for own profile)
        const topRated = ratingsRes.data
          .sort((a, b) => b.rating - a.rating || new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);
        setTopRatedFilms(topRated);
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchListFilms = async (listType) => {
    if (!isOwnProfile || !user) return; // Only allow for own profile
    
    const targetUserId = profileUserId || user.id;
    try {
      const response = await axios.get(`${API}/users/${targetUserId}/film-lists/${listType}?viewer_id=${user.id}`);
      setListFilms(response.data);
    } catch (error) {
      console.error('Error fetching list films:', error);
    }
  };

  useEffect(() => {
    if (isOwnProfile) {
      fetchListFilms(selectedList);
    }
  }, [selectedList, user, isOwnProfile]);

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

  const getListTypeLabel = (type) => {
    const labels = {
      'favorites': 'Favoritos',
      'watched': 'Assistidos',
      'to_watch': 'Quero Assistir'
    };
    return labels[type] || type;
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

  const currentUser = profileUser || user;

  if (!currentUser) {
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
                <AvatarImage src={currentUser.avatar_url} />
                <AvatarFallback className="text-2xl bg-green-100 text-green-800">
                  {currentUser.name[0]}
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
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_private"
                        checked={editData.is_private}
                        onChange={(e) => setEditData({...editData, is_private: e.target.checked})}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="is_private" className="text-sm">
                        Perfil privado (apenas amigos podem ver)
                      </label>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-2xl text-green-800">{currentUser.name}</CardTitle>
                      {currentUser.is_supporter && (
                        <Star className="text-yellow-500 fill-yellow-500" size={24} title="Apoiador" />
                      )}
                      {currentUser.is_private && (
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">Privado</span>
                      )}
                    </div>
                    <CardDescription className="text-base mt-2">
                      {currentUser.description || 'Amante do cinema brasileiro'}
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
                  isOwnProfile && (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                      Editar Perfil
                    </Button>
                  )
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Favorite Films - Only for own profile */}
        {isOwnProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-800">Filmes Favoritos</CardTitle>
            <CardDescription>
              Seus filmes marcados como favoritos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {favoriteFilms.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {favoriteFilms.map((film) => (
                  <Link key={film.id} to={`/films/${film.id}`}>
                    <div className="aspect-[2/3] bg-gradient-to-br from-green-200 to-yellow-200 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity">
                      {film.banner_url ? (
                        <img 
                          src={film.banner_url} 
                          alt={film.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Film size={32} className="text-green-600" />
                      )}
                    </div>
                    <p className="text-sm font-medium mt-2 text-center line-clamp-2">
                      {film.title}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Nenhum filme marcado como favorito ainda
              </p>
            )}
            {favoriteFilms.length > 0 && (
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedList('favorites')}
                  className="text-green-600"
                >
                  Ver todos os favoritos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Top Rated Films - Only for own profile */}
        {isOwnProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-800">Minhas Melhores Avaliações</CardTitle>
            <CardDescription>
              Filmes que você deu as melhores notas (mais recentes primeiro)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topRatedFilms.length > 0 ? (
              <div className="space-y-3">
                {topRatedFilms.map((rating) => (
                  <div key={rating.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <Link to={`/films/${rating.film_id}`} className="flex-1 flex items-center space-x-3">
                      <div className="w-12 h-16 bg-gradient-to-br from-green-200 to-yellow-200 rounded flex items-center justify-center">
                        <Film size={20} className="text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{rating.film_title}</h3>
                        <p className="text-sm text-gray-600">{rating.film_year}</p>
                      </div>
                    </Link>
                    <div className="flex items-center space-x-2">
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
                      <span className="text-sm font-medium">{rating.rating}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Você ainda não avaliou nenhum filme
              </p>
            )}
          </CardContent>
        </Card>
        )}

        {/* Film Lists - Only for own profile */}
        {isOwnProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-800">Minhas Listas</CardTitle>
            <CardDescription>
              Organize seus filmes por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <select
                value={selectedList}
                onChange={(e) => setSelectedList(e.target.value)}
                className="px-4 py-2 border border-green-300 rounded-md bg-white text-green-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="favorites">Favoritos</option>
                <option value="watched">Assistidos</option>
                <option value="to_watch">Quero Assistir</option>
              </select>
            </div>
            
            <div className="min-h-[200px]">
              {listFilms.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {listFilms.map((film) => (
                    <Link key={film.id} to={`/films/${film.id}`}>
                      <div className="aspect-[2/3] bg-gradient-to-br from-green-200 to-yellow-200 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity">
                        {film.banner_url ? (
                          <img 
                            src={film.banner_url} 
                            alt={film.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Film size={32} className="text-green-600" />
                        )}
                      </div>
                      <p className="text-sm font-medium mt-2 text-center line-clamp-2">
                        {film.title}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Film size={48} className="mx-auto mb-4" />
                  <p>Nenhum filme na lista "{getListTypeLabel(selectedList)}"</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

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
  const [userLists, setUserLists] = useState({ favorites: false, watched: false, to_watch: false });
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
        
        // Check user's lists
        const [favoritesRes, watchedRes, toWatchRes] = await Promise.all([
          axios.get(`${API}/users/${user.id}/film-lists/favorites?viewer_id=${user.id}`),
          axios.get(`${API}/users/${user.id}/film-lists/watched?viewer_id=${user.id}`),
          axios.get(`${API}/users/${user.id}/film-lists/to_watch?viewer_id=${user.id}`)
        ]);
        
        setUserLists({
          favorites: favoritesRes.data.some(f => f.id === id),
          watched: watchedRes.data.some(f => f.id === id),
          to_watch: toWatchRes.data.some(f => f.id === id)
        });
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
      alert('Erro ao enviar avaliação. Verifique se o comentário atende às diretrizes da comunidade.');
    }
  };

  const handleReportComment = async (commentId) => {
    if (!user) return;
    
    const reason = prompt('Motivo da denúncia:\n1. spam\n2. inappropriate\n3. harassment\n4. off_topic\n5. other\n\nDigite o número ou palavra:');
    const reasonMap = {
      '1': 'spam',
      '2': 'inappropriate', 
      '3': 'harassment',
      '4': 'off_topic',
      '5': 'other'
    };
    
    const finalReason = reasonMap[reason] || reason;
    if (!['spam', 'inappropriate', 'harassment', 'off_topic', 'other'].includes(finalReason)) {
      alert('Motivo inválido');
      return;
    }
    
    const description = prompt('Descrição adicional (opcional):');
    
    try {
      await axios.post(`${API}/comments/report?user_id=${user.id}`, {
        comment_id: commentId,
        reason: finalReason,
        description: description || undefined
      });
      alert('Denúncia enviada com sucesso! Nossa equipe irá analisar.');
    } catch (error) {
      console.error('Error reporting comment:', error);
      alert('Erro ao enviar denúncia. ' + (error.response?.data?.detail || ''));
    }
  };

  const toggleFilmList = async (listType) => {
    if (!user) {
      alert('Faça login para usar as listas');
      return;
    }

    try {
      if (userLists[listType]) {
        // Remove from list
        await axios.delete(`${API}/users/${user.id}/film-lists/${id}/${listType}`);
      } else {
        // Add to list
        await axios.post(`${API}/users/${user.id}/film-lists`, {
          film_id: id,
          list_type: listType
        });
      }
      
      // Update local state
      setUserLists({
        ...userLists,
        [listType]: !userLists[listType]
      });
      
    } catch (error) {
      console.error('Error updating film list:', error);
      alert('Erro ao atualizar lista. Tente novamente.');
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
            
            {/* User Lists Actions */}
            {user && (
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-3">Minhas Listas</h3>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant={userLists.favorites ? "default" : "outline"}
                    className={`${userLists.favorites ? 'bg-red-500 hover:bg-red-600' : 'border-red-500 text-red-600 hover:bg-red-50'}`}
                    onClick={() => toggleFilmList('favorites')}
                  >
                    <Star className={`mr-2 ${userLists.favorites ? 'fill-white' : ''}`} size={16} />
                    {userLists.favorites ? 'Favoritado' : 'Favoritar'}
                  </Button>
                  
                  <Button
                    variant={userLists.watched ? "default" : "outline"}
                    className={`${userLists.watched ? 'bg-green-500 hover:bg-green-600' : 'border-green-500 text-green-600 hover:bg-green-50'}`}
                    onClick={() => toggleFilmList('watched')}
                  >
                    <span className="mr-2">{userLists.watched ? '✓' : '👁️'}</span>
                    {userLists.watched ? 'Assistido' : 'Marcar como Assistido'}
                  </Button>
                  
                  <Button
                    variant={userLists.to_watch ? "default" : "outline"}
                    className={`${userLists.to_watch ? 'bg-blue-500 hover:bg-blue-600' : 'border-blue-500 text-blue-600 hover:bg-blue-50'}`}
                    onClick={() => toggleFilmList('to_watch')}
                  >
                    <span className="mr-2">{userLists.to_watch ? '📋' : '⏰'}</span>
                    {userLists.to_watch ? 'Na Lista' : 'Quero Assistir'}
                  </Button>
                </div>
              </div>
            )}

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
                        <div className="flex items-center space-x-3">
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
                          {user && user.id !== rating.user_id && (
                            <button
                              onClick={() => handleReportComment(rating.id)}
                              className="text-gray-400 hover:text-red-500 text-xs"
                              title="Denunciar comentário"
                            >
                              ⚠️
                            </button>
                          )}
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
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/encontrar" element={<EncontrarPage />} />
            <Route path="/apoie" element={<ApoiePage />} />
            <Route path="/moderator" element={<ModeratorDashboard />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;