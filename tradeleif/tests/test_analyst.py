import json

import pytest

from eu_trader.analyst import ClaudeCodeAnalyst, FallbackAnalyst, RuleAnalyst


def ctx(sym, closes, pos=0, cost=0):
    return {"symbol": sym, "bars_15m": [{"c": c} for c in closes], "position_qty": pos, "avg_cost": cost}


def test_claude_code_batch_parsing():
    seen = {}

    def runner(stdin):
        seen["stdin"] = stdin
        return json.dumps({"type": "result", "is_error": False, "result":
                           'Her: {"EQNR":{"action":"BUY","size_fraction":0.4,"confidence":0.8,"reason":"trend"},'
                           '"SAP":{"action":"HOLD","size_fraction":0,"confidence":0.3,"reason":"flatt"}}'})

    d = ClaudeCodeAnalyst(runner=runner).decide_many({"EQNR": ctx("EQNR", [1] * 20), "SAP": ctx("SAP", [1] * 20)})
    assert d["EQNR"]["action"] == "BUY" and d["EQNR"]["size_fraction"] == 0.4 and d["SAP"]["action"] == "HOLD"
    assert '"EQNR"' in seen["stdin"] and "DATA:" in seen["stdin"]


def test_claude_code_strips_api_key_and_uses_tempdir(monkeypatch, tmp_path):
    import subprocess

    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-ugyldig")
    got = {}

    def fake_run(args, **kw):
        got.update(args=args, **kw)
        return subprocess.CompletedProcess(args, 0, stdout=json.dumps({"is_error": False, "result": "{}"}), stderr="")

    monkeypatch.setattr("shutil.which", lambda n: "/usr/bin/claude")
    monkeypatch.setattr(subprocess, "run", fake_run)
    ClaudeCodeAnalyst().verify_model()
    assert "ANTHROPIC_API_KEY" not in got["env"]
    assert got["args"][:2] == ["/usr/bin/claude", "-p"] and "--tools" in got["args"] and got["cwd"] != "."


def test_fallback_to_rules_and_logs():
    errs = []

    def boom(_):
        raise RuntimeError("ikke innlogget")

    fa = FallbackAnalyst(ClaudeCodeAnalyst(runner=boom), RuleAnalyst(), lambda w, m: errs.append(m))
    up = [100 + i for i in range(20)]
    d = fa.decide_many({"EQNR": ctx("EQNR", up)})
    assert d["EQNR"]["action"] == "BUY" and d["EQNR"]["reason"].startswith("[REGLER") and errs


def test_rules():
    r = RuleAnalyst()
    assert r.decide(ctx("A", [100 + i for i in range(20)]))["action"] == "BUY"
    assert r.decide(ctx("A", [120 - i for i in range(20)], pos=10, cost=110))["action"] == "SELL"
    assert r.decide(ctx("A", [120 - i for i in range(20)]))["action"] == "HOLD"  # ingen shorting
    assert r.decide(ctx("A", [1, 2]))["action"] == "HOLD"
