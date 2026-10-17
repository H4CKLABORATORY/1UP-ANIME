"""No-network checks for the background Scrapling metadata snapshot."""
import json
import os
import sys
import tempfile
from pathlib import Path
from unittest import TestCase, main
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))
import snapshot


class FakeResponse:
    status = 200
    def __init__(self, body, url=snapshot.ROBOTS_URL):
        self.body, self.url = body.encode(), url
    def __enter__(self):
        return self
    def __exit__(self, *unused):
        return False
    def geturl(self):
        return self.url
    def read(self, count):
        return self.body[:count]


class SnapshotTests(TestCase):
    def test_password_and_approval_required(self):
        for env in [
            {},
            {"SCRAPLING_SOURCE_APPROVED": "1"},
            {"SCRAPLING_SOURCE_APPROVED": "1", "SCRAPLING_AUTOMATION_ENABLED": "1"},
            {"SCRAPLING_SOURCE_APPROVED": "1", "SCRAPLING_AUTOMATION_ENABLED": "1", "SCRAPLING_AUTOMATION_TOKEN": "short"},
        ]:
            with self.assertRaises(snapshot.SourceNotApproved):
                snapshot.require_owner_approval(env)
        snapshot.require_owner_approval({
            "SCRAPLING_SOURCE_APPROVED": "1",
            "SCRAPLING_AUTOMATION_ENABLED": "1",
            "SCRAPLING_AUTOMATION_TOKEN": "a" * 40,
        })

    def test_robots_fail_closed(self):
        self.assertFalse(snapshot.robots_permits(lambda *args, **kwargs: (_ for _ in ()).throw(OSError("offline"))))
        self.assertFalse(snapshot.robots_permits(lambda *args, **kwargs: FakeResponse("User-agent: *\nDisallow: /")))
        self.assertFalse(snapshot.robots_permits(lambda *args, **kwargs: FakeResponse("User-agent: *\nAllow: /",
                                                                          "https://evil.example/robots.txt")))
        self.assertTrue(snapshot.robots_permits(lambda *args, **kwargs: FakeResponse("User-agent: *\nAllow: /")))

    def test_dedup_no_players_no_empty_overwrite(self):
        cards = [
            {"title": "Demo Title", "url": "/demo-title/", "episode": "https://example.com/video"},
            {"title": "Demo Title", "url": "https://jkanime.net/demo-title/"},
            {"title": "Malicious", "url": "https://evil.example/anything"},
            {"title": "Otro Anime", "url": "/otro-anime/", "streaming": ["unverified"]},
        ]
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "data" / "scrapling-discovery.json"
            self.assertTrue(snapshot.save_snapshot(cards, path, "2026-10-17T00:00:00Z"))
            first = path.read_text(encoding="utf-8")
            data = json.loads(first)
            self.assertFalse(data["streaming"])
            self.assertEqual(len(data["items"]), 2)
            self.assertEqual(set(data["items"][0]), {"title", "url", "provider"})
            self.assertFalse(snapshot.save_snapshot(cards, path, "2099-10-17T00:00:00Z"))
            self.assertEqual(first, path.read_text(encoding="utf-8"))
            with self.assertRaises(ValueError):
                snapshot.save_snapshot([], path)
            self.assertEqual(first, path.read_text(encoding="utf-8"))

    def test_denied_run_does_not_access_network(self):
        with patch.dict(os.environ, {"SCRAPLING_SOURCE_APPROVED": "0"}, clear=True):
            with patch.object(snapshot, "robots_permits") as check, patch.object(snapshot, "fetch_cards") as fetch:
                with self.assertRaises(snapshot.SourceNotApproved):
                    snapshot.main()
                check.assert_not_called()
                fetch.assert_not_called()


if __name__ == "__main__":
    main()
