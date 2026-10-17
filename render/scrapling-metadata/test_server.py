"""Offline tests: no keys, DNS lookups, downloads or third-party requests."""
import http.client
import importlib.util
import os
from pathlib import Path
from threading import Thread
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('scrapling_server', Path(__file__).with_name('server.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SECRET = 'test-only-token-' + 'z' * 40


class CardTests(unittest.TestCase):
    def test_allowlist(self):
        self.assertEqual(module.safe_catalog_link('/kaoru-hana-wa-rin-to-saku/'),
                         'https://jkanime.net/kaoru-hana-wa-rin-to-saku/')
        for bad in ['https://evil.com/anime-name/', 'http://jkanime.net/test-title/',
                    'https://jkanime.net:8443/test-title/', '/episode/1?stream=foo',
                    '//private.example/series-test/']:
            self.assertEqual(module.safe_catalog_link(bad), '')

    def test_protects_token_configuration(self):
        with self.assertRaises(ValueError):
            module.CatalogServer(('127.0.0.1', 0), 'short')

    def test_auth_disabled_source_cache_and_no_streaming(self):
        calls = []
        server = module.CatalogServer(('127.0.0.1', 0), SECRET,
                         fetcher=lambda q: calls.append(q) or [{'title': 'Example', 'provider': 'JKAnime', 'url': 'https://jkanime.net/example-title/'}])
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            def get(path, token=None):
                conn = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=2)
                conn.request('GET', path, headers={'X-API-Key': token} if token else {})
                resp = conn.getresponse()
                import json
                data = json.loads(resp.read())
                conn.close()
                return resp.status, data
            code, _ = get('/api/v1/catalog?q=Example')
            self.assertEqual(code, 401)
            with patch.dict(os.environ, {'SCRAPLING_SOURCE_APPROVED': '0'}):
                code, _ = get('/api/v1/catalog?q=Example', SECRET)
                self.assertEqual(code, 503)
            with patch.dict(os.environ, {'SCRAPLING_SOURCE_APPROVED': '1'}):
                code, body = get('/api/v1/catalog?q=Example', SECRET)
                self.assertEqual(code, 200)
                self.assertFalse(body['streaming'])
                self.assertEqual(len(body['results']), 1)
                code, _ = get('/api/v1/catalog?q=Example', SECRET)
                self.assertEqual(code, 200)
                self.assertEqual(calls, ['Example'])
                self.assertEqual(get('/api/v1/episode', SECRET)[0], 404)
                self.assertEqual(get('/api/v1/catalog?q=E', SECRET)[0], 400)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(2)


if __name__ == '__main__':
    unittest.main()
