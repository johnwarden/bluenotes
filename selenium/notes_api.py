"""Community Notes XRPC helpers.

Auth follows `fetchWithAgentAuth` in src/lib/api/community-notes-auth.ts:

- Password session: send ``Authorization: Bearer <accessJwt>`` only when the
  JWT is non-empty.
- OAuth / DPoP: not implemented here (browser DPoP is out of scope). Do not
  invent an empty Bearer.
- Soft-anon getProposals / getConfig: omit the Authorization header entirely.

The notes service treats ``Authorization: Bearer `` (empty token) as a hard
401. Unauthenticated getProposals with ``uris=`` is allowed and returns 200.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


def auth_headers(access_jwt: str | None = None) -> dict[str, str]:
    """Build headers using fetchWithAgentAuth semantics. Never empty Bearer."""
    if isinstance(access_jwt, str) and access_jwt.strip():
        return {"Authorization": f"Bearer {access_jwt.strip()}"}
    return {}


def http_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    body: dict[str, Any] | None = None,
    timeout: float = 30,
) -> tuple[int, Any]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/json")
    if body is not None:
        req.add_header("Content-Type", "application/json")
    for key, value in (headers or {}).items():
        if value is None:
            continue
        if key.lower() == "authorization" and (
            not str(value).strip() or str(value).strip().lower() == "bearer"
        ):
            # Never send an empty Bearer — omit instead.
            continue
        req.add_header(key, value)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            parsed: Any = json.loads(raw) if raw else {}
            return resp.status, parsed
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"error": raw.decode("utf-8", "replace")}
        return exc.code, parsed


def get_config(notes_api: str) -> tuple[int, dict[str, Any]]:
    url = f"{notes_api.rstrip('/')}/xrpc/org.opencommunitynotes.getConfig"
    status, payload = http_json("GET", url, headers=auth_headers(None))
    return status, payload if isinstance(payload, dict) else {}


def get_proposals(
    notes_api: str,
    uris: list[str],
    *,
    access_jwt: str | None = None,
    status_filter: str | None = None,
) -> tuple[int, dict[str, Any]]:
    if not uris:
        raise ValueError("getProposals requires at least one uri")
    params = [("uris", uri) for uri in uris]
    if status_filter:
        params.append(("status", status_filter))
    query = urllib.parse.urlencode(params)
    url = f"{notes_api.rstrip('/')}/xrpc/org.opencommunitynotes.getProposals?{query}"
    status, payload = http_json("GET", url, headers=auth_headers(access_jwt))
    return status, payload if isinstance(payload, dict) else {}


def propose(
    notes_api: str,
    access_jwt: str,
    target_uri: str,
    note_text: str,
    reasons: list[str],
) -> tuple[int, dict[str, Any]]:
    url = f"{notes_api.rstrip('/')}/xrpc/org.opencommunitynotes.propose"
    status, payload = http_json(
        "POST",
        url,
        headers=auth_headers(access_jwt),
        body={
            "typ": "label",
            "uri": target_uri,
            "val": "annotation",
            "note": note_text,
            "reasons": reasons,
        },
    )
    return status, payload if isinstance(payload, dict) else {}


def vote(
    notes_api: str,
    access_jwt: str,
    note_uri: str,
    val: int,
    reasons: list[str],
) -> tuple[int, dict[str, Any]]:
    url = f"{notes_api.rstrip('/')}/xrpc/org.opencommunitynotes.vote"
    status, payload = http_json(
        "POST",
        url,
        headers=auth_headers(access_jwt),
        body={"uri": note_uri, "val": val, "reasons": reasons},
    )
    return status, payload if isinstance(payload, dict) else {}


def create_password_session(
    pds: str,
    identifier: str,
    password: str,
) -> tuple[int, dict[str, Any]]:
    url = f"{pds.rstrip('/')}/xrpc/com.atproto.server.createSession"
    status, payload = http_json(
        "POST",
        url,
        body={"identifier": identifier, "password": password},
    )
    return status, payload if isinstance(payload, dict) else {}


def get_feed(public_api: str, feed_uri: str, *, limit: int = 15) -> tuple[int, dict[str, Any]]:
    query = urllib.parse.urlencode({"feed": feed_uri, "limit": str(limit)})
    url = f"{public_api.rstrip('/')}/xrpc/app.bsky.feed.getFeed?{query}"
    status, payload = http_json("GET", url)
    return status, payload if isinstance(payload, dict) else {}
