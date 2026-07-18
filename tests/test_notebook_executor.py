import json

import nbformat
from nbformat.v4 import new_code_cell, new_notebook

from backend.domain.models import ExperimentArm
from backend.infrastructure.code_policy import PythonCodePolicy
from backend.infrastructure.executors import ExperimentExecutor
from backend.infrastructure.process import LocalProcessRunner


def test_executes_parameterized_notebook(tmp_path) -> None:
    bundle = tmp_path / "bundle"
    bundle.mkdir()
    notebook = new_notebook(
        cells=[
            new_code_cell(
                "seed = 0\nresults_path = 'results.json'",
                metadata={"tags": ["parameters"]},
            ),
            new_code_cell(
                "import json\nwith open(results_path, 'w', encoding='utf-8') as handle:\n"
                "    json.dump({'metrics': {'score': seed / 10}}, handle)"
            ),
        ]
    )
    nbformat.write(notebook, bundle / "experiment.ipynb")
    executor = ExperimentExecutor(
        LocalProcessRunner(timeout_seconds=60, max_memory_mb=1024, max_output_kb=128),
        PythonCodePolicy(blocked_modules=["requests", "socket"]),
    )
    result = executor.execute(
        ExperimentArm(name="candidate", entrypoint="experiment.ipynb", kind="notebook"),
        bundle,
        tmp_path / "trial",
        seed=7,
        phase="validation",
    )
    assert result.status == "succeeded"
    payload = json.loads((tmp_path / "trial" / "results.json").read_text(encoding="utf-8"))
    assert payload["metrics"]["score"] == 0.7
