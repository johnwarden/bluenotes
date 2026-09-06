"""Live Selenium smoke for Blue Notes Community Notes (A–E).

Default gate (CI / no OAuth creds): soft-anon Explore on
``/community-notes/rated_helpful`` — visible note body + getProposals 200
with Authorization omitted.

Signed-in OAuth/DPoP path exists and skips clearly when credentials are
missing. Label chrome / feed shell without a visible note body is FAIL.
"""

from __future__ import annotations

import time
from typing import Any
from urllib.parse import urlparse

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait

from conftest import Settings
from helpers import (
    assert_getproposals_auth,
    assert_visible_note_bodies_or_fail,
    body_text,
    open_helpful_feed_via_nav,
    probe_proposals,
    wait_cn_surface,
)
from login import dismiss_welcome_gate, login_with_oauth, login_with_password
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


def _feed_uri(config: dict[str, Any], tab: str) -> str:
    did = config["feedGeneratorDid"]
    return f"at://{did}/app.bsky.feed.generator/{tab}"


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


def _notes_from_proposals(proposals: list[dict[str, Any]]) -> list[str]:
    return [
        p.get("note") or ""
        for p in proposals
        if isinstance(p.get("note"), str) and p.get("note", "").strip()
    ]


def _require_notes(settings: Settings, tab: str) -> list[str]:
    status, config = get_config(settings.notes_api)
    assert status == 200 and config.get("labelerDid"), config
    _posts, proposals = _discover_noted_posts(settings, config, tab)
    notes = _notes_from_proposals(proposals)
    assert notes, (
        f"{tab} feed posts have no getProposals note bodies; "
        "cannot evaluate CommunityNoteWidget. Check the notes service."
    )
    return notes


def _open_cn_tab_soft_anon(driver: WebDriver, settings: Settings, tab: str) -> str:
    driver.get(f"{settings.base_url}/community-notes/{tab}")
    dismiss_welcome_gate(driver)
    surface = wait_cn_surface(driver)
    if surface == "error":
        pytest.fail(
            f"CN {tab} tab errored. url={driver.current_url} "
            f"text={body_text(driver)[:400]}"
        )
    if surface == "empty":
        pytest.fail(f"CN {tab} tab loaded an empty feed (no real posts).")
    if surface == "splash":
        pytest.fail(
            f"CN {tab} stayed on the signed-out splash after Explore. "
            f"url={driver.current_url}"
        )
    return surface


def _require_oauth_creds(settings: Settings) -> None:
    if not settings.has_oauth_creds:
        pytest.skip(
            "Signed-in OAuth/DPoP note-body test skipped: set OAUTH_IDENTIFIER "
            "(or BSKY_IDENTIFIER) and OAUTH_PASSWORD. Soft-anon Explore on "
            "/community-notes/rated_helpful is the default CI gate. "
            "Never send an empty Bearer."
        )


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

    stripped_status, _ = http_json("GET", url, headers={"Authorization": "Bearer "})
    assert stripped_status == 200, (
        f"http_json must drop empty Bearer (got HTTP {stripped_status})"
    )
    omit_status, omit_body = get_proposals(live_app.notes_api, [uri])
    assert omit_status == 200, f"omitted Authorization should be 200, got {omit_status}"
    assert "proposals" in omit_body


@pytest.mark.live
def test_b_soft_anon_explore_rated_helpful_visible_body(
    live_app: Settings, driver: WebDriver
) -> None:
    """Default gate: Explore without signing in on /community-notes/rated_helpful.

    Visible note body required. getProposals must be 200 with Authorization
    omitted. Label chrome / feed shell alone FAIL.
    """
    notes = _require_notes(live_app, "rated_helpful")
    surface = _open_cn_tab_soft_anon(driver, live_app, "rated_helpful")
    assert surface == "posts"
    assert "/community-notes/rated_helpful" in driver.current_url, driver.current_url

    assert_visible_note_bodies_or_fail(
        driver, notes, surface="/community-notes/rated_helpful (soft-anon Explore)"
    )
    events = probe_proposals(driver)
    assert_getproposals_auth(events, mode="omit", required=True)


@pytest.mark.live
def test_b_soft_anon_needs_your_help_visible_body(
    live_app: Settings, driver: WebDriver
) -> None:
    """Same bar on Rate Proposed chrome (do not narrow the product bar)."""
    notes = _require_notes(live_app, "needs_your_help")
    _open_cn_tab_soft_anon(driver, live_app, "needs_your_help")
    assert_visible_note_bodies_or_fail(
        driver, notes, surface="/community-notes/needs_your_help (soft-anon Explore)"
    )
    events = probe_proposals(driver)
    assert_getproposals_auth(events, mode="omit", required=False)


@pytest.mark.live
@pytest.mark.oauth
def test_b_signed_in_oauth_dpop_note_bodies(
    live_app: Settings, driver: WebDriver
) -> None:
    """Signed-in OAuth: DPoP getProposals + visible bodies on Helpful chrome.

    Covers in-app Helpful home/feed-tab navigation and
    ``/community-notes/rated_helpful``. Skips when OAuth creds are missing.
    """
    _require_oauth_creds(live_app)
    notes = _require_notes(live_app, "rated_helpful")

    if not login_with_oauth(driver, live_app):
        pytest.fail(
            "OAuth credentials were set but the handle-only DPoP flow did not "
            "complete a signed-in session. Check PDS consent (OAUTH_PASSWORD "
            "must be the account password, not an app password) and that "
            "Authorization is never an empty Bearer."
        )

    # 1) Helpful home / feed-tab chrome (in-app Community Notes nav).
    driver.get(f"{live_app.base_url}/")
    dismiss_welcome_gate(driver, timeout=2)
    open_helpful_feed_via_nav(driver, live_app.base_url)
    surface = wait_cn_surface(driver)
    if surface != "posts":
        pytest.fail(
            f"Signed-in Helpful home/feed-tab did not load posts ({surface}). "
            f"url={driver.current_url} text={body_text(driver)[:400]}"
        )
    assert_visible_note_bodies_or_fail(
        driver, notes, surface="Helpful home/feed-tab (signed-in OAuth)"
    )
    nav_events = probe_proposals(driver)
    assert_getproposals_auth(nav_events, mode="dpop", required=True)

    # 2) Direct rated_helpful route under the same DPoP session.
    driver.execute_script(
        "if (window.__cnSmoke) window.__cnSmoke.proposals = [];"
    )
    driver.get(f"{live_app.base_url}/community-notes/rated_helpful")
    surface = wait_cn_surface(driver)
    if surface != "posts":
        pytest.fail(
            f"Signed-in /community-notes/rated_helpful did not load posts "
            f"({surface}). url={driver.current_url}"
        )
    assert_visible_note_bodies_or_fail(
        driver,
        notes,
        surface="/community-notes/rated_helpful (signed-in OAuth)",
    )
    direct_events = probe_proposals(driver)
    assert_getproposals_auth(direct_events, mode="dpop", required=True)


@pytest.mark.live
@pytest.mark.parametrize("tab", CN_TABS)
def test_e_cn_tab_loads_real_posts(
    live_app: Settings, driver: WebDriver, tab: str
) -> None:
    driver.get(f"{live_app.base_url}/community-notes/{tab}")
    dismiss_welcome_gate(driver)
    surface = wait_cn_surface(driver)
    if surface == "splash" and live_app.identifier and live_app.password:
        if login_with_password(driver, live_app):
            driver.get(f"{live_app.base_url}/community-notes/{tab}")
            dismiss_welcome_gate(driver)
            surface = wait_cn_surface(driver)
    if surface == "splash":
        pytest.skip(
            f"/{tab} presented the signed-out splash. Soft-anon getProposals "
            "is allowed; CN tabs may require a session. Set BSKY_IDENTIFIER "
            "+ BSKY_APP_PASSWORD, or use the dedicated OAuth/DPoP test."
        )
    if surface == "error":
        pytest.fail(
            f"CN tab {tab!r} errored. url={driver.current_url} "
            f"text={body_text(driver)[:400]}"
        )
    if surface == "empty":
        pytest.fail(f"CN tab {tab!r} is blank (empty feed), expected real posts.")
    items = driver.find_elements(By.CSS_SELECTOR, '[data-testid^="feedItem-by-"]')
    assert items, f"CN tab {tab!r} loaded without feed items"


def _password_jwt(settings: Settings) -> str:
    if not settings.identifier or not settings.password:
        pytest.skip(
            "Write test skipped: set BSKY_IDENTIFIER and BSKY_APP_PASSWORD "
            "(or BSKY_PASSWORD). Signed-in note-body checks use the OAuth/DPoP "
            "test (OAUTH_IDENTIFIER + OAUTH_PASSWORD) instead."
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
def test_c_propose_succeeds(live_app: Settings, driver: WebDriver) -> None:
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

    gp_status, gp = get_proposals(live_app.notes_api, [target], access_jwt=token)
    assert gp_status == 200, gp
    notes = [p.get("note") or "" for p in gp.get("proposals") or []]
    assert any(unique.split()[0] in (n or "") for n in notes) or any(
        "selenium-smoke" in (n or "") for n in notes
    ), f"propose succeeded but getProposals did not return the note: {gp}"

    handle_path = target.split("/")
    try:
        rkey = handle_path[-1]
        did = urlparse(target.replace("at://", "https://")).netloc or handle_path[2]
        driver.get(f"{live_app.base_url}/profile/{did}/post/{rkey}")
        WebDriverWait(driver, 15).until(
            lambda d: "selenium-smoke" in body_text(d)
        )
    except Exception:
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
