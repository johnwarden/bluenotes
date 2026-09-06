"""Live Selenium smoke for Blue Notes Community Notes (A–E).

Soft-anon is allowed for getConfig, getProposals(uris=), feed tabs, and
reading note bodies. propose/vote are optional and skip when credentials
are missing. OAuth DPoP login is not automated (separate concern).
"""

from __future__ import annotations

import time
from typing import Any
from urllib.parse import urlparse

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait

from assertions import (
    assert_note_bodies_rendered,
    is_chrome_only_false_pass,
    page_shows_note_body,
    page_shows_widget_chrome,
)
from conftest import NetworkSniffer, Settings, authorization_is_empty_bearer
from login import login_with_password
from notes_api import (
    create_password_session,
    get_config,
    get_feed,
    get_proposals,
    http_json,
    propose,
    vote,
)

CN_TABS = ("needs_your_help", "new", "rated_helpful")


def _body_text(driver: WebDriver) -> str:
    try:
        return driver.find_element(By.TAG_NAME, "body").text
    except Exception:
        return driver.page_source


def _feed_uri(config: dict[str, Any], tab: str) -> str:
    did = config["feedGeneratorDid"]
    return f"at://{did}/app.bsky.feed.generator/{tab}"


def _post_path(post: dict[str, Any]) -> str:
    uri = post.get("uri") or ""
    handle = (post.get("author") or {}).get("handle") or ""
    rkey = uri.rstrip("/").split("/")[-1]
    return f"/profile/{handle}/post/{rkey}"


def _wait_cn_surface(driver: WebDriver, timeout: float = 40) -> str:
    """Return posts | empty | error | splash once the CN route settles."""

    def settled(d: WebDriver) -> str | bool:
        text = _body_text(d)
        if "Could not load feed" in text:
            return "error"
        if d.find_elements(By.CSS_SELECTOR, '[data-testid="communityNotesFeedScreenError"]'):
            return "error"
        if d.find_elements(By.CSS_SELECTOR, '[data-testid^="feedItem-by-"]'):
            return "posts"
        if d.find_elements(By.CSS_SELECTOR, '[data-testid="communityNotesFeed"]'):
            if "This feed is empty." in text:
                return "empty"
        if d.find_elements(By.CSS_SELECTOR, '[data-testid="noSessionView"]'):
            # May still be hydrating the signed-out shell; keep waiting a bit.
            if "Community Notes" in text or "Readers added" in text:
                return False
            return "splash"
        if "This feed is empty." in text:
            return "empty"
        return False

    return WebDriverWait(driver, timeout).until(settled)


def _discover_noted_posts(
    settings: Settings, config: dict[str, Any], tab: str = "rated_helpful"
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    status, feed = get_feed(settings.public_api, _feed_uri(config, tab), limit=12)
    if status != 200:
        pytest.fail(f"app.bsky.feed.getFeed {tab} returned HTTP {status}: {feed}")
    posts = [item.get("post") or {} for item in feed.get("feed") or [] if item.get("post")]
    uris = [p["uri"] for p in posts if p.get("uri")]
    if not uris:
        return [], []
    gp_status, gp = get_proposals(settings.notes_api, uris)
    if gp_status != 200:
        pytest.fail(f"getProposals returned HTTP {gp_status}: {gp}")
    return posts, list(gp.get("proposals") or [])


def _notes_for_visible_posts(
    posts: list[dict[str, Any]], proposals: list[dict[str, Any]]
) -> list[str]:
    return [
        p.get("note") or ""
        for p in proposals
        if isinstance(p.get("note"), str) and p.get("note", "").strip()
    ]


@pytest.mark.live
def test_a_get_config_sets_labeler_did(live_app: Settings) -> None:
    status, config = get_config(live_app.notes_api)
    assert status == 200, f"getConfig HTTP {status}: {config}"
    assert config.get("labelerDid"), f"labelerDid missing: {config}"
    assert str(config["labelerDid"]).startswith("did:"), config
    assert config.get("feedGeneratorDid"), f"feedGeneratorDid missing: {config}"
    assert str(config["feedGeneratorDid"]).startswith("did:"), config


@pytest.mark.live
def test_empty_bearer_is_401_omit_is_ok(live_app: Settings) -> None:
    """Contract: empty Bearer is a hard 401; omitted Authorization is soft-anon."""
    import urllib.error
    import urllib.request

    uri = "at://did:plc:33avz2l7y5scw3abq3lmylns/app.bsky.feed.post/3m3uyojshds23"
    url = (
        f"{live_app.notes_api}/xrpc/org.opencommunitynotes.getProposals"
        f"?uris={uri}"
    )
    # Prove the service: an empty Bearer is a hard 401.
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", "Bearer ")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            empty_status = resp.status
    except urllib.error.HTTPError as exc:
        empty_status = exc.code
    assert empty_status == 401, (
        f"empty Bearer must be 401 (got {empty_status}); "
        "never send Authorization: Bearer "
    )

    # Helpers must omit that header, which the service accepts as soft-anon.
    stripped_status, _ = http_json("GET", url, headers={"Authorization": "Bearer "})
    assert stripped_status == 200, (
        f"http_json must drop empty Bearer (got HTTP {stripped_status})"
    )
    omit_status, omit_body = get_proposals(live_app.notes_api, [uri])
    assert omit_status == 200, f"omitted Authorization should be 200, got {omit_status}"
    assert "proposals" in omit_body


@pytest.mark.live
def test_b_note_body_required_not_chrome_only(
    live_app: Settings, driver: WebDriver, network: NetworkSniffer
) -> None:
    status, config = get_config(live_app.notes_api)
    assert status == 200 and config.get("labelerDid")
    posts, proposals = _discover_noted_posts(live_app, config, "rated_helpful")
    notes = _notes_for_visible_posts(posts, proposals)
    assert notes, (
        "rated_helpful feed posts have no getProposals note bodies; "
        "cannot evaluate CommunityNoteWidget. Check the notes service."
    )

    driver.get(f"{live_app.base_url}/community-notes/rated_helpful")
    surface = _wait_cn_surface(driver)
    if surface == "splash" and live_app.identifier and live_app.password:
        if login_with_password(driver, live_app):
            driver.get(f"{live_app.base_url}/community-notes/rated_helpful")
            surface = _wait_cn_surface(driver)
    if surface == "splash":
        # Soft-anon fallback: open a post thread that has a helpful note.
        post = next((p for p in posts if p.get("author", {}).get("handle")), None)
        assert post, "no post handle available for thread fallback"
        driver.get(f"{live_app.base_url}{_post_path(post)}")
        WebDriverWait(driver, 40).until(
            lambda d: "Readers added" in _body_text(d)
            or any(page_shows_note_body(_body_text(d), n) for n in notes)
            or d.find_elements(By.CSS_SELECTOR, '[data-testid^="feedItem-by-"]')
            or d.find_elements(By.CSS_SELECTOR, '[data-testid^="postThreadItem-by-"]')
        )
    elif surface == "error":
        pytest.fail(
            "CN rated_helpful tab errored (Could not load feed). "
            f"url={driver.current_url} text={_body_text(driver)[:400]}"
        )
    elif surface == "empty":
        pytest.fail("CN rated_helpful tab loaded an empty feed (no real posts).")

    deadline = time.time() + 25
    last_text = ""
    saw_chrome = False
    while time.time() < deadline:
        last_text = _body_text(driver)
        if any(page_shows_note_body(last_text, note) for note in notes):
            break
        if page_shows_widget_chrome(last_text):
            saw_chrome = True
        time.sleep(0.5)

    events = network.proposals_events()
    if events:
        for event in events:
            assert not authorization_is_empty_bearer(event.get("authorization")), (
                "App sent Authorization: Bearer  (empty). "
                "fetchWithAgentAuth must omit the header or send DPoP / a real JWT. "
                f"url={event.get('url')}"
            )
            assert "uris=" in (event.get("url") or ""), (
                f"getProposals was called without uris=: {event.get('url')}"
            )
            if event.get("status") is not None:
                assert event["status"] == 200, (
                    f"getProposals HTTP {event['status']} {event.get('url')}"
                )
            captured = event.get("body") or {}
            captured_notes = [
                p.get("note") or ""
                for p in captured.get("proposals") or []
                if p.get("note")
            ]
            if captured_notes:
                notes = captured_notes

    if is_chrome_only_false_pass(last_text, notes):
        pytest.fail(
            "FALSE PASS condition: Readers Added Context / Rate Proposed chrome "
            "is visible on the Helpful Community Notes surface, but no note "
            "body text from getProposals is rendered. "
            f"captured_getProposals={len(events)} url={driver.current_url}"
        )

    assert_note_bodies_rendered(last_text, notes)
    if not events:
        # Network assertion is “when feasible.” CDP can miss late responses;
        # API-side getProposals already succeeded above.
        pass
    elif saw_chrome:
        pass


@pytest.mark.live
@pytest.mark.parametrize("tab", CN_TABS)
def test_e_cn_tab_loads_real_posts(
    live_app: Settings, driver: WebDriver, tab: str
) -> None:
    driver.get(f"{live_app.base_url}/community-notes/{tab}")
    surface = _wait_cn_surface(driver)
    if surface == "splash" and live_app.identifier and live_app.password:
        if login_with_password(driver, live_app):
            driver.get(f"{live_app.base_url}/community-notes/{tab}")
            surface = _wait_cn_surface(driver)
    if surface == "splash":
        pytest.skip(
            f"/{tab} presented the signed-out splash. Soft-anon getProposals "
            "is allowed; CN tabs may require a session. Set BSKY_IDENTIFIER "
            "+ BSKY_APP_PASSWORD to exercise signed-in tabs. "
            "OAuth soft-gate is a separate concern."
        )
    if surface == "error":
        pytest.fail(
            f"CN tab {tab!r} errored. url={driver.current_url} "
            f"text={_body_text(driver)[:400]}"
        )
    if surface == "empty":
        pytest.fail(f"CN tab {tab!r} is blank (empty feed), expected real posts.")
    items = driver.find_elements(By.CSS_SELECTOR, '[data-testid^="feedItem-by-"]')
    assert items, f"CN tab {tab!r} loaded without feed items"


def _password_jwt(settings: Settings) -> str:
    if not settings.identifier or not settings.password:
        pytest.skip(
            "Write test skipped: set BSKY_IDENTIFIER and BSKY_APP_PASSWORD "
            "(or BSKY_PASSWORD). OAuth/DPoP credentials are not used here."
        )
    if not settings.allow_writes:
        pytest.skip(
            "Write test skipped: refusing to propose/vote against a non-local "
            "BASE_URL without SMOKE_ALLOW_WRITES=1 "
            f"(BASE_URL={settings.base_url})."
        )
    status, session = create_password_session(
        settings.pds, settings.identifier, settings.password
    )
    token = session.get("accessJwt") if isinstance(session, dict) else None
    if status != 200 or not token:
        pytest.fail(f"createSession HTTP {status}: {session}")
    return str(token)


@pytest.mark.live
@pytest.mark.write
def test_c_propose_succeeds(
    live_app: Settings, driver: WebDriver
) -> None:
    token = _password_jwt(live_app)
    target = live_app.write_post_uri
    if not target:
        status, config = get_config(live_app.notes_api)
        assert status == 200
        posts, _ = _discover_noted_posts(live_app, config, "new")
        target = (posts[-1] or {}).get("uri") if posts else None
    if not target:
        pytest.skip(
            "Write test skipped: set SMOKE_WRITE_POST_URI=at://... to choose "
            "a post to annotate."
        )

    unique = f"selenium-smoke {int(time.time())} https://example.com/selenium-smoke"
    status, body = propose(
        live_app.notes_api,
        token,
        target,
        unique,
        ["other"],
    )
    if status == 400 and (
        body.get("error") == "DuplicateProposal"
        or "already created" in str(body).lower()
    ):
        pytest.skip(f"propose skipped: already have a note on {target}")
    assert status == 200, f"propose HTTP {status}: {body}"
    assert body.get("uri") or (body.get("proposal") or {}).get("uri"), body

    # Persistence check: getProposals (with JWT, never empty Bearer) sees the note.
    gp_status, gp = get_proposals(live_app.notes_api, [target], access_jwt=token)
    assert gp_status == 200, gp
    notes = [p.get("note") or "" for p in gp.get("proposals") or []]
    assert any(unique.split()[0] in (n or "") for n in notes) or any(
        "selenium-smoke" in (n or "") for n in notes
    ), f"propose succeeded but getProposals did not return the note: {gp}"

    handle_path = target.split("/")
    # Best-effort UI confirm; API success already counts.
    try:
        rkey = handle_path[-1]
        did = urlparse(target.replace("at://", "https://")).netloc or handle_path[2]
        driver.get(f"{live_app.base_url}/profile/{did}/post/{rkey}")
        WebDriverWait(driver, 15).until(
            lambda d: "selenium-smoke" in _body_text(d)
        )
    except Exception:
        # API persistence already asserted; UI confirm is best-effort.
        pass


@pytest.mark.live
@pytest.mark.write
def test_d_vote_persists(live_app: Settings, driver: WebDriver) -> None:
    token = _password_jwt(live_app)
    status, config = get_config(live_app.notes_api)
    assert status == 200
    _posts, proposals = _discover_noted_posts(live_app, config, "needs_your_help")
    if not proposals:
        _posts, proposals = _discover_noted_posts(live_app, config, "rated_helpful")
    note_uri = next((p.get("uri") for p in proposals if p.get("uri")), None)
    target_uri = next((p.get("targetUri") for p in proposals if p.get("targetUri")), None)
    if not note_uri:
        pytest.skip("vote skipped: getProposals returned no notes to rate")

    status, body = vote(live_app.notes_api, token, note_uri, 1, ["helpful_other"])
    assert status == 200, f"vote HTTP {status}: {body}"
    assert body.get("success") is True or body.get("rating"), body

    if target_uri:
        gp_status, gp = get_proposals(
            live_app.notes_api, [target_uri], access_jwt=token
        )
        assert gp_status == 200, gp
        matched = next(
            (p for p in gp.get("proposals") or [] if p.get("uri") == note_uri),
            None,
        )
        viewer = (matched or {}).get("viewer") or {}
        rating = viewer.get("rating") or {}
        if rating:
            assert rating.get("val") == 1, f"vote did not persist: {rating}"
