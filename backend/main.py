"""ASGI 入口。"""

import os

from dotenv import load_dotenv

load_dotenv()

from backend.api.webapp import create_app

app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("BACKEND_PORT", "4019")))
