"""Optional, authenticated, metadata-only Scrapling service for 1UP Anime.

No arbitrary URLs, video extraction, player links, or browser-facing credentials.
Deploy separately behind HTTPS after permission/robots checks; NOT enabled by default.
"""
from __future__ import annotations

import hmac
import json
import os
import re
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Lock
from urllib.parse import urljoin, urlsplit, parse_qs

BASE_URL = "https://jkanime.net/"
ALLOWED_HOSTS = {"jkanime.net", "www.jkanime.net"}
SLUG = re.compile(r"/[a-z0-9][a-z0-9-]{2,110}/?\Z", re.IGNORECASE)
SPACES = re.compile(r"\s+")
MAX_RESULTS = 24
WINDOW_SECONDS = 60
MAX_REQUESTS = 12
CACHE_SECONDS = 600


def clean(text: str, limit: int = 150) -> str:
    return SPACES.sub(" ", str(text or "")).strip()[:limit]


def safe_catalog_link(href: str) -> str:
    """Only accept simple catalog links on the hardcoded public source."""
    if not href or len(href) > 500:
        return ""
    target = urlsplit(urljoin(BASE_URL, href))
    if (target.scheme != "https" or target.hostname not in ALLOWED_HOSTS
            or target.port is not None or target.username or target.password
            or target.query or target.fragment or not SLUG.fullmatch(target.path)):
        return ""
    return "https://" + target.hostname + target.path


def extract_cards(page, query: str = "") -> list[dict[str, str]]:
    """Parse text/link metadata from a Scrapling Response; never expose media."""
    result, seen = [], set()
    for anchor in page.css('a[href]'):
        url = safe_catalog_link(anchor.attrib.get('href', ''))
        if not url or url in seen:
            continue
        image_title = anchor.css('img::attr(alt)').get()
        title = clean(anchor.attrib.get('title') or image_title or anchor.get_all_text(separator=' ', strip=True))
        if len(title) < 3 or title.casefold() in {'inicio', 'ver anime online', 'top animes'}:
            continue
        if query and query.casefold() not in title.casefold():
            continue
        seen.add(url)
        result.append({'title': title, 'url': url, 'provider': 'JKAnime'})
        if len(result) >= MAX_RESULTS:
            break
    return result


def fetch_cards(query: str):
    from scrapling.fetchers import Fetcher
    # No stealth, proxy rotation, challenge bypass, or media/episode requests.
    page = Fetcher.get(BASE_URL, stealthy_headers=False, follow_redirects=False,
                       retries=1, timeout=12, headers={'User-Agent': '1UPAnimeMetadata/1.0'})
    if page.status != 200:
        raise RuntimeError('Public metadata source unavailable')
    return extract_cards(page, query)


class CatalogServer(HTTPServer):
    def __init__(self, addr, token: str, fetcher=fetch_cards):
        if len(token) < 32:
            raise ValueError('SCRAPLING_API_TOKEN must have at least 32 characters')
        self.token = token
        self.fetcher = fetcher
        self.lock = Lock()
        self.requests = []
        self.cache = {}
        super().__init__(addr, CatalogHandler)


class CatalogHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Do not log secret headers or search queries.
        pass

    def respond(self, code, value):
        payload = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path == '/health' and not parsed.query:
            return self.respond(200, {'ok': True, 'service': 'scrapling-metadata-only',
                                      'streaming': False, 'enabled': os.getenv('SCRAPLING_SOURCE_APPROVED') == '1'})
        if parsed.path != '/api/v1/catalog':
            return self.respond(404, {'error': 'Ruta inexistente'})
        supplied = self.headers.get('X-API-Key', '')
        if not hmac.compare_digest(supplied.encode(), self.server.token.encode()):
            return self.respond(401, {'error': 'Autenticación necesaria'})
        if os.getenv('SCRAPLING_SOURCE_APPROVED') != '1':
            return self.respond(503, {'error': 'Fuente pendiente de revisión de permisos'})
        params = parse_qs(parsed.query, keep_blank_values=True)
        if set(params) - {'q'} or len(params.get('q', [''])) != 1:
            return self.respond(400, {'error': 'Parámetros no válidos'})
        query = clean(params.get('q', [''])[0], 80)
        if len(parsed.query) > 150 or len(query) < 2 or len(query) > 80:
            return self.respond(400, {'error': 'Búsqueda inválida'})
        now = time.monotonic()
        with self.server.lock:
            self.server.requests = [t for t in self.server.requests if now - t < WINDOW_SECONDS]
            if len(self.server.requests) >= MAX_REQUESTS:
                return self.respond(429, {'error': 'Límite temporal alcanzado'})
            self.server.requests.append(now)
            hit = self.server.cache.get(query.casefold())
        if hit and hit[0] > now:
            return self.respond(200, hit[1])
        try:
            results = self.server.fetcher(query)
            value = {'source': 'jkanime_public_metadata', 'mode': 'catalog_only',
                     'streaming': False, 'query': query,
                     'retrievedAt': datetime.now(timezone.utc).isoformat(),
                     'results': results[:MAX_RESULTS]}
            with self.server.lock:
                self.server.cache[query.casefold()] = (now + CACHE_SECONDS, value)
                if len(self.server.cache) > 120:
                    self.server.cache.clear()
            return self.respond(200, value)
        except Exception:
            return self.respond(502, {'error': 'Fuente de metadatos no disponible'})


def main():
    token = os.environ.get('SCRAPLING_API_TOKEN', '')
    # HTTPS must be provided by the host's TLS reverse proxy (Render).
    server = CatalogServer(('0.0.0.0', int(os.environ.get('PORT', '10000'))), token)
    server.serve_forever()


if __name__ == '__main__':
    main()
