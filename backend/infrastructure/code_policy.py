"""对模型生成的 Python 代码进行最低限度的静态安全检查。"""

from __future__ import annotations

import ast
from dataclasses import dataclass


@dataclass(frozen=True)
class PolicyViolation:
    line: int
    rule: str
    message: str


class PythonCodePolicy:
    """阻止明显危险能力；它不是容器或操作系统沙箱的替代品。"""

    def __init__(self, blocked_modules: list[str], max_lines: int = 250):
        self.blocked_modules = set(blocked_modules)
        self.max_lines = max_lines
        self.blocked_calls = {
            "eval",
            "exec",
            "compile",
            "__import__",
            "os.system",
            "os.popen",
            "shutil.rmtree",
        }

    def inspect(self, source: str) -> list[PolicyViolation]:
        violations: list[PolicyViolation] = []
        lines = source.splitlines()
        if len(lines) > self.max_lines:
            violations.append(
                PolicyViolation(1, "max-lines", f"生成代码超过 {self.max_lines} 行")
            )
        try:
            tree = ast.parse(source)
        except SyntaxError as error:
            return [PolicyViolation(error.lineno or 1, "syntax", error.msg)]

        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                names = [alias.name for alias in node.names] if isinstance(node, ast.Import) else [node.module or ""]
                for name in names:
                    root = name.split(".")[0]
                    if root in self.blocked_modules:
                        violations.append(
                            PolicyViolation(node.lineno, "blocked-import", f"禁止导入模块: {root}")
                        )
            if isinstance(node, ast.Call):
                name = self._call_name(node.func)
                if name in self.blocked_calls:
                    violations.append(
                        PolicyViolation(node.lineno, "blocked-call", f"禁止调用: {name}")
                    )
        return violations

    @staticmethod
    def _call_name(node: ast.expr) -> str:
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name):
            return f"{node.value.id}.{node.attr}"
        return ""
