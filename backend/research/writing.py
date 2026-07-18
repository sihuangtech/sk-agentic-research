"""根据已验证结果生成可审计论文，不允许模型虚构参考文献。"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import matplotlib.pyplot as plt
from pydantic import BaseModel, Field

from backend.core.storage import atomic_write_json
from backend.domain.models import Evidence, Hypothesis, ValidationReport
from backend.infrastructure.llm import LlmClient, extract_json
from backend.infrastructure.prompts import PromptRepository


class PaperDraft(BaseModel):
    title: str
    abstract: str
    introduction: str
    methods: str
    results: str
    limitations: str
    conclusion: str
    cited_evidence_ids: list[str] = Field(default_factory=list)


class WritingService:
    def __init__(self, llm: LlmClient, prompts: PromptRepository):
        self.llm = llm
        self.prompts = prompts

    def write(
        self,
        hypothesis: Hypothesis,
        evidence: list[Evidence],
        report: ValidationReport,
        output_dir: Path,
    ) -> dict[str, str]:
        output_dir.mkdir(parents=True, exist_ok=True)
        prompt = self.prompts.render(
            "writing",
            "draft_paper",
            hypothesis=hypothesis.model_dump_json(indent=2),
            evidence=json.dumps(
                [item.model_dump(mode="json") for item in evidence],
                ensure_ascii=False,
                indent=2,
            ),
            validation=report.model_dump_json(indent=2),
            claim_status=self._claim_status(report),
        )
        draft = PaperDraft.model_validate(extract_json(self.llm.complete(prompt)))
        if report.decision.value != "accepted":
            label = self._claim_status(report)
            draft.title = f"[{label}] {draft.title}"
            draft.abstract = f"{label}。{draft.abstract}"
            draft.conclusion = f"{label}。{draft.conclusion}"
        allowed_ids = {item.id for item in evidence}
        draft.cited_evidence_ids = [item for item in draft.cited_evidence_ids if item in allowed_ids]
        atomic_write_json(output_dir / "paper.json", draft.model_dump(mode="json"))
        self._plot(report, output_dir / "metrics.png")
        markdown_path = output_dir / "paper.md"
        tex_path = output_dir / "paper.tex"
        markdown_path.write_text(self._markdown(draft, evidence, report), encoding="utf-8")
        tex_path.write_text(self._latex(draft, evidence, report), encoding="utf-8")
        artifacts = {"paper_markdown": str(markdown_path), "paper_tex": str(tex_path)}
        if pdf_path := self._compile(tex_path):
            artifacts["paper_pdf"] = str(pdf_path)
        return artifacts

    @staticmethod
    def _claim_status(report: ValidationReport) -> str:
        return {
            "accepted": "假设在留出验证中得到支持",
            "rejected": "假设未达到预设改进门槛",
            "inconclusive": "结果波动过大，结论不确定",
            "invalid": "实验执行或数据不完整，不能形成结论",
        }[report.decision.value]

    @staticmethod
    def _plot(report: ValidationReport, path: Path) -> None:
        if report.baseline_mean is None or report.candidate_mean is None:
            return
        figure, axis = plt.subplots(figsize=(6, 4))
        axis.bar(["Baseline", "Candidate"], [report.baseline_mean, report.candidate_mean])
        axis.set_ylabel(report.metric_name)
        axis.set_title("Held-out validation")
        figure.tight_layout()
        figure.savefig(path, dpi=160)
        plt.close(figure)

    def _markdown(
        self,
        draft: PaperDraft,
        evidence: list[Evidence],
        report: ValidationReport,
    ) -> str:
        references = self._references(draft, evidence, markdown=True)
        return f"""# {draft.title}

## 摘要
{draft.abstract}

## 引言
{draft.introduction}

## 方法
{draft.methods}

## 结果
{draft.results}

**验证决策：{report.decision.value}**

{'; '.join(report.reasons)}

## 局限
{draft.limitations}

## 结论
{draft.conclusion}

## 参考资料
{references or '本报告没有引用外部资料。'}
"""

    def _latex(self, draft: PaperDraft, evidence: list[Evidence], report: ValidationReport) -> str:
        fields = {name: self._escape(getattr(draft, name)) for name in (
            "title", "abstract", "introduction", "methods", "results", "limitations", "conclusion"
        )}
        decision = self._escape(f"{report.decision.value}: {'; '.join(report.reasons)}")
        references = self._references(draft, evidence, markdown=False)
        image = "\\includegraphics[width=0.72\\linewidth]{metrics.png}" if report.baseline_mean is not None else ""
        return f"""\\documentclass[11pt]{{article}}
\\usepackage[margin=1in]{{geometry}}
\\usepackage{{graphicx}}
\\usepackage{{url}}
\\usepackage[T1]{{fontenc}}
\\title{{{fields['title']}}}
\\date{{}}
\\begin{{document}}
\\maketitle
\\begin{{abstract}}{fields['abstract']}\\end{{abstract}}
\\section{{Introduction}} {fields['introduction']}
\\section{{Methods}} {fields['methods']}
\\section{{Results}} {fields['results']}\\par\\textbf{{Validation decision:}} {decision}
\\begin{{center}}{image}\\end{{center}}
\\section{{Limitations}} {fields['limitations']}
\\section{{Conclusion}} {fields['conclusion']}
\\begin{{thebibliography}}{{99}}
{references}
\\end{{thebibliography}}
\\end{{document}}
"""

    @staticmethod
    def _references(draft: PaperDraft, evidence: list[Evidence], markdown: bool) -> str:
        selected = {item.id: item for item in evidence if item.id in draft.cited_evidence_ids}
        if markdown:
            return "\n".join(f"- [{key}]({item.url}) {item.title}" for key, item in selected.items())
        return "\n".join(
            f"\\bibitem{{{key}}} {WritingService._escape(item.title)}. \\url{{{item.url}}}"
            for key, item in selected.items()
        )

    @staticmethod
    def _escape(value: str) -> str:
        replacements = {"\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_", "{": r"\{", "}": r"\}"}
        return "".join(replacements.get(char, char) for char in value)

    @staticmethod
    def _compile(tex_path: Path) -> Path | None:
        if not shutil.which("pdflatex"):
            return None
        try:
            result = subprocess.run(
                ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", tex_path.name],
                cwd=tex_path.parent,
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            return None
        pdf_path = tex_path.with_suffix(".pdf")
        return pdf_path if result.returncode == 0 and pdf_path.exists() else None
