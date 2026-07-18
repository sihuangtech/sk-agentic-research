"""文献与代码检索适配器，输出统一 Evidence 结构。"""

from __future__ import annotations

import hashlib
import os
from typing import Protocol

import arxiv
import requests

from backend.domain.models import Evidence


def evidence_id(source: str, url: str) -> str:
    digest = hashlib.sha256(f"{source}:{url}".encode()).hexdigest()[:12]
    return f"{source.lower().replace(' ', '-')}-{digest}"


class SearchProvider(Protocol):
    name: str

    def search(self, query: str, limit: int) -> list[Evidence]: ...


class ArxivProvider:
    name = "arxiv"

    def search(self, query: str, limit: int) -> list[Evidence]:
        search = arxiv.Search(
            query=query,
            max_results=limit,
            sort_by=arxiv.SortCriterion.Relevance,
        )
        results = arxiv.Client().results(search)
        return [
            Evidence(
                id=evidence_id(self.name, item.entry_id),
                source=self.name,
                title=item.title.strip(),
                url=item.entry_id,
                abstract=item.summary.strip(),
                year=item.published.year if item.published else None,
                authors=[author.name for author in item.authors],
            )
            for item in results
        ]


class SemanticScholarProvider:
    name = "semantic_scholar"
    endpoint = "https://api.semanticscholar.org/graph/v1/paper/search"

    def __init__(self, timeout: int = 20):
        self.timeout = timeout

    def search(self, query: str, limit: int) -> list[Evidence]:
        headers = {}
        if key := os.getenv("SEMANTIC_SCHOLAR_API_KEY"):
            headers["x-api-key"] = key
        response = requests.get(
            self.endpoint,
            params={
                "query": query,
                "limit": limit,
                "fields": "title,abstract,url,year,authors,externalIds",
            },
            headers=headers,
            timeout=self.timeout,
        )
        response.raise_for_status()
        evidence: list[Evidence] = []
        for item in response.json().get("data", []):
            url = item.get("url") or f"https://www.semanticscholar.org/paper/{item['paperId']}"
            evidence.append(
                Evidence(
                    id=evidence_id(self.name, url),
                    source=self.name,
                    title=item.get("title") or "Untitled",
                    url=url,
                    abstract=item.get("abstract") or "",
                    year=item.get("year"),
                    authors=[author.get("name", "") for author in item.get("authors", [])],
                )
            )
        return evidence


class GithubProvider:
    name = "github"
    endpoint = "https://api.github.com/search/repositories"

    def __init__(self, timeout: int = 20):
        self.timeout = timeout

    def search(self, query: str, limit: int) -> list[Evidence]:
        headers = {"Accept": "application/vnd.github+json"}
        if token := os.getenv("GITHUB_TOKEN"):
            headers["Authorization"] = f"Bearer {token}"
        response = requests.get(
            self.endpoint,
            params={"q": query, "per_page": limit, "sort": "stars"},
            headers=headers,
            timeout=self.timeout,
        )
        response.raise_for_status()
        return [
            Evidence(
                id=evidence_id(self.name, item["html_url"]),
                source=self.name,
                title=item["full_name"],
                url=item["html_url"],
                abstract=item.get("description") or "",
            )
            for item in response.json().get("items", [])
        ]


def build_providers(names: list[str], timeout: int) -> list[SearchProvider]:
    available: dict[str, SearchProvider] = {
        "arxiv": ArxivProvider(),
        "semantic_scholar": SemanticScholarProvider(timeout),
        "github": GithubProvider(timeout),
    }
    unknown = sorted(set(names) - available.keys())
    if unknown:
        raise ValueError(f"未知检索提供方: {', '.join(unknown)}")
    return [available[name] for name in names]
