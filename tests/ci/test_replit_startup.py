import json
from pathlib import Path
import tomllib
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ReplitStartupTests(unittest.TestCase):
    def test_run_button_selects_the_canonical_frontend_command(self):
        config = tomllib.loads((ROOT / ".replit").read_text())
        workflows = config["workflows"]
        selected = [w for w in workflows["workflow"] if w["name"] == workflows["runButton"]]
        self.assertEqual(len(selected), 1)
        self.assertEqual(selected[0]["tasks"], [{"task": "shell.exec", "args": config["run"], "waitForPort": 5000}])
        self.assertEqual(config["run"], "npm run start:replit")
        package = json.loads((ROOT / "package.json").read_text())
        self.assertEqual(package["scripts"]["start:replit"], "node scripts/start-replit.mjs")
        self.assertEqual(config["modules"], ["nodejs-20"])
        self.assertEqual(config["ports"], [{"localPort": 5000, "externalPort": 80}])
        self.assertNotIn("integrations", config.get("agent", {}))
