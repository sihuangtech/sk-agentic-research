"""并行检索、去重和证据快照。"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from backend.core.storage import atomic_write_json
from backend.domain.models import Evidence
from backend.infrastructure.search import SearchProvider


class LiteratureService:
    def __init__(self, providers: list[SearchProvider], results_per_provider: int = 5):
        self.providers = providers
        self.results_per_provider = results_per_provider
        self.logger = logging.getLogger(__name__)

    def search(self, query: str, output_path: Path) -> list[Evidence]:
        """并行查询；单个来源失败不会吞掉其他来源结果。"""
        evidence: dict[str, Evidence] = {}
        with ThreadPoolExecutor(max_workers=max(1, len(self.providers))) as pool:
            futures = {
                pool.submit(provider.search, query, self.results_per_provider): provider
                for provider in self.providers
            }
            for future in as_completed(futures):
                provider = futures[future]
                try:
                    for item in future.result():
                        normalized = item.url.rstrip("/").lower()
                        if normalized not in evidence:
                            evidence[normalized] = item
                except Exception as error:
                    self.logger.warning("检索来源 %s 失败: %s", provider.name, error)
        results = list(evidence.values())
        if not results:
            raise RuntimeError("所有检索来源均失败或没有返回证据，已停止假设生成")
        atomic_write_json(output_path, [item.model_dump(mode="json") for item in results])
        return results
