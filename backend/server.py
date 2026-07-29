"""
Reverse proxy backend.

This project is a Next.js-only app: its API route handlers live inside the
Next.js server on port 3000. The platform ingress forwards every `/api/*`
request to this service on port 8001. To make those API routes reachable from
the public preview URL, this app transparently proxies ALL incoming requests to
the Next.js server running on localhost:3000.
"""
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response

UPSTREAM = "http://localhost:3000"

app = FastAPI()

# Hop-by-hop headers that must not be forwarded.
HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "content-encoding",
    "content-length",
}

client = httpx.AsyncClient(base_url=UPSTREAM, timeout=60.0, follow_redirects=False)


@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy(path: str, request: Request):
    url = httpx.URL(path="/" + path, query=request.url.query.encode("utf-8"))

    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in HOP_BY_HOP and k.lower() != "host"
    }

    body = await request.body()

    upstream = await client.request(
        request.method,
        url,
        headers=headers,
        content=body,
    )

    resp_headers = {
        k: v for k, v in upstream.headers.items()
        if k.lower() not in HOP_BY_HOP
    }

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
    )
