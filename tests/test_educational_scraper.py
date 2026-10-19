import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("oneup_scraper", ROOT / "scripts/scrape-encyclopedia-anime.py")
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class ScraperTest(unittest.TestCase):
    def test_parse_and_provenance(self):
        html = (ROOT / "tests/fixtures/encyclopedia-anime.html").read_text(encoding="utf-8")
        rows = module.parse_html(html)
        self.assertEqual(len(rows), 3)
        self.assertEqual([r["format"] for r in rows], ["Película", "Película", "TV"])
        self.assertEqual(rows[1]["title"], "Película de continuación")
        self.assertEqual(rows[1]["release"], "January 9")
        self.assertEqual(rows[2]["episodes"], 12)
        self.assertEqual(rows[2]["sourceUrl"], "https://en.wikipedia.org/wiki/Example_series")

    def test_duplicate_and_external_link_rejected(self):
        html = '<h3>Films</h3><table class="wikitable"><tr><th>Title</th></tr>'
        html += '<tr><td><a href="https://bad.example/watch">Ejemplo</a></td></tr>' * 2 + '</table>'
        rows = module.parse_html(html)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["sourceUrl"], module.SOURCE)

    def test_atomic_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "sub" / "out.json"
            module.atomic_write(target, module.snapshot([{"title": "Prueba"}]))
            loaded = json.loads(target.read_text(encoding="utf-8"))
            self.assertEqual(loaded["count"], 1)


if __name__ == "__main__":
    unittest.main()
