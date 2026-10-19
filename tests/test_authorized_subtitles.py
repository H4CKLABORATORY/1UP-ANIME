import importlib.util
import unittest
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "scripts" / "generate-authorized-subtitles.py"
spec = importlib.util.spec_from_file_location("oneup_subtitle_generator", p)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SubtitleGeneratorTest(unittest.TestCase):
    def test_webvtt_with_two_cues(self):
        captions = [{"start": 0.1, "end": 2.4, "text": "Hola mundo"},
                    {"start": 62.2, "end": 65.1, "text": "<b>¡Vamos!</b>"}]
        actual = module.to_vtt(captions)
        self.assertIn("00:00:00.100 --> 00:00:02.400", actual)
        self.assertIn("00:01:02.200 --> 00:01:05.100", actual)
        self.assertIn("¡Vamos!", actual)
        self.assertNotIn("<b>", actual)

    def test_no_caption_rejected(self):
        with self.assertRaises(ValueError):
            module.to_vtt([{"start": 1, "end": 1, "text": "empty"}])

    def test_translation_is_applied(self):
        content = module.to_vtt([{"start": 1, "end": 2, "text": "hello"}], str.upper)
        self.assertIn("HELLO", content)


if __name__ == "__main__":
    unittest.main()
