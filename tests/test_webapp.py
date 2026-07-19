import httpx
import pytest

from backend.api.webapp import create_app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_core_read_endpoints_are_available() -> None:
    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        assert (await client.get("/api/v1/system/status")).status_code == 200
        assert (await client.get("/api/v1/config")).status_code == 200
        assert isinstance((await client.get("/api/v1/runs")).json(), list)


@pytest.mark.anyio
async def test_desktop_sidecar_requires_ephemeral_token(monkeypatch) -> None:
    monkeypatch.setenv("PAPERMILL_DESKTOP_TOKEN", "desktop-secret")
    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        assert (await client.get("/api/v1/system/status")).status_code == 401
        assert (
            await client.get(
                "/api/v1/system/status",
                headers={"X-Papermill-Token": "desktop-secret"},
            )
        ).status_code == 200
        assert (
            await client.get("/api/v1/system/status?token=desktop-secret")
        ).status_code == 200


def test_stream_route_precedes_dynamic_pipeline_route() -> None:
    paths = list(create_app().openapi()["paths"])
    assert paths.index("/api/v1/pipelines/stream") < paths.index("/api/v1/pipelines/{run_id}")
