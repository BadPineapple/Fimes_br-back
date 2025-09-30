# app/services/content_filter.py
import re
import unicodedata
from typing import List, Dict, Tuple, Optional

class ContentFilter:
    # Palavras proibidas (base). Use minúsculas, sem acento.
    FORBIDDEN_WORDS = {
        'merda', 'bosta', 'caralho', 'porra', 'cu', 'buceta', 'piroca',
        'fdp', 'pqp', 'vsf', 'krl', 'puta', 'vagabundo', 'viado'
    }

    # Domínios de link permitidos (ajuste conforme seu produto)
    ALLOWED_DOMAINS = {
        'imdb.com', 'letterboxd.com', 'youtube.com',
        'globoplay.globo.com', 'netflix.com', 'primevideo.com', 'telecine.globo.com', 'mubi.com'
    }

    # Padrões de spam/contato
    _PATTERN_URL = re.compile(r'https?://[^\s]+', re.IGNORECASE)
    _PATTERN_WWW = re.compile(r'\bwww\.[^\s]+', re.IGNORECASE)
    _PATTERN_EMAIL = re.compile(r'\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b', re.IGNORECASE)
    _PATTERN_PHONE = re.compile(r'\b\d{4,5}[-.\s]?\d{4,5}\b')
    _PATTERN_SPAM_WORDS = re.compile(r'\b(compre|venda|promo(ç|c)ão|desconto|clique\s+aqui)\b', re.IGNORECASE)
    _PATTERN_SOCIAL = re.compile(r'\b(whatsapp|telegram|instagram|facebook)\b', re.IGNORECASE)
    _PATTERN_DOMAIN = re.compile(r'https?://([^/\s]+)', re.IGNORECASE)

    # Tokenização por palavra (com fronteira)
    _PATTERN_TOKEN = re.compile(r'\b\w+\b', re.UNICODE)

    # parâmetros
    MIN_LEN = 3
    MAX_LEN = 1000
    MIN_UNIQUE_RATIO = 0.5  # pelo menos 50% das palavras devem ser distintas

    # mapeamento simples para leetspeak → letra
    _LEET = str.maketrans({
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's'
    })

    @classmethod
    def _normalize(cls, text: str) -> str:
        """Normaliza: NFKC, sem acento, lowercase e de-leet básico."""
        if not text:
            return ''
        # NFKC
        t = unicodedata.normalize('NFKC', text)
        # remove acentos
        t = ''.join(ch for ch in unicodedata.normalize('NFD', t)
                    if unicodedata.category(ch) != 'Mn')
        # lower + leet
        t = t.lower().translate(cls._LEET)
        return t

    @classmethod
    def _contains_forbidden(cls, normalized_text: str) -> Optional[str]:
        """Checa palavrões como tokens inteiros (boundary), evitando substring inocente."""
        tokens = cls._PATTERN_TOKEN.findall(normalized_text)
        token_set = set(tokens)
        for bad in cls.FORBIDDEN_WORDS:
            if bad in token_set:
                return bad
        return None

    @classmethod
    def _has_repetition(cls, normalized_text: str) -> bool:
        tokens = cls._PATTERN_TOKEN.findall(normalized_text)
        if not tokens:
            return False
        unique_ratio = len(set(tokens)) / len(tokens)
        return unique_ratio < cls.MIN_UNIQUE_RATIO

    @classmethod
    def _extract_domains(cls, text: str) -> List[str]:
        return [m.group(1).lower() for m in cls._PATTERN_DOMAIN.finditer(text)]

    @classmethod
    def check(cls, text: str) -> Dict[str, object]:
        """
        Retorna um relatório estruturado:
        {
          'ok': bool,
          'codes': ['empty', 'profanity', 'spam_link', ...],
          'reasons': [str, ...]
        }
        """
        reasons: List[str] = []
        codes: List[str] = []

        if not text or not text.strip():
            return {'ok': False, 'codes': ['empty'], 'reasons': ['Comentário vazio']}

        # Tamanho
        size = len(text.strip())
        if size < cls.MIN_LEN:
            reasons.append('Comentário muito curto')
            codes.append('too_short')
        if size > cls.MAX_LEN:
            reasons.append(f'Comentário muito longo (máx. {cls.MAX_LEN})')
            codes.append('too_long')

        # Normalização e tokens
        norm = cls._normalize(text)

        # Profanidade
        bad = cls._contains_forbidden(norm)
        if bad:
            reasons.append('Linguagem inadequada detectada')
            codes.append('profanity')

        # Spam / links
        has_url = bool(cls._PATTERN_URL.search(text) or cls._PATTERN_WWW.search(text))
        has_email = bool(cls._PATTERN_EMAIL.search(text))
        has_phone = bool(cls._PATTERN_PHONE.search(text))
        has_spam_words = bool(cls._PATTERN_SPAM_WORDS.search(text))
        has_social = bool(cls._PATTERN_SOCIAL.search(text))

        if has_email:
            reasons.append('E-mail não permitido no comentário')
            codes.append('email')
        if has_phone:
            reasons.append('Telefone não permitido no comentário')
            codes.append('phone')

        if has_url:
            # Permite links apenas de domínios em allowlist
            domains = cls._extract_domains(text)
            blocked = [d for d in domains if not any(d.endswith(allow) for allow in cls.ALLOWED_DOMAINS)]
            if blocked:
                reasons.append('Links não permitidos')
                codes.append('spam_link')

        if has_spam_words or has_social:
            reasons.append('Conteúdo com termos de spam/convite a redes sociais')
            codes.append('spam_words')

        # Repetição
        if cls._has_repetition(norm):
            reasons.append('Conteúdo repetitivo detectado')
            codes.append('repetition')

        ok = not reasons
        return {'ok': ok, 'codes': codes, 'reasons': reasons}

    # ---- Wrapper compatível com sua assinatura original ----
    @classmethod
    def is_content_safe(cls, text: str) -> Tuple[bool, str]:
        rep = cls.check(text)
        return rep['ok'], (rep['reasons'][0] if rep['reasons'] else '')
