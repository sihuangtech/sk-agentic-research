from backend.infrastructure.code_policy import PythonCodePolicy


def test_blocks_network_and_dynamic_execution() -> None:
    policy = PythonCodePolicy(["requests", "socket"])
    violations = policy.inspect("import requests\neval('1 + 1')\n")
    assert {item.rule for item in violations} == {"blocked-import", "blocked-call"}


def test_accepts_small_scientific_script() -> None:
    policy = PythonCodePolicy(["requests"])
    assert policy.inspect("import json\nprint(json.dumps({'score': 1.0}))\n") == []
