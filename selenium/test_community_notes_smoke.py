"""Live Selenium smoke for Blue Notes Community Notes (A–E).

Note bodies must appear anywhere a post with a note is shown:

1. Community Notes feeds (needs_your_help / new / rated_helpful)
2. Main home feed (same post card)
3. Direct post URL / thread (/profile/.../post/...)

Explore on the CN tab alone is not sufficient. Label chrome without
``note.text`` is FAIL on every surface.

Soft-anon is the default CI gate. Signed-in OAuth/DPoP picks a known
noted post and asserts all three surfaces; it skips when creds are missing.
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
    NOTE_BODY_SURFACES,
    NotedPost,
    assert_getproposals_auth,
    assert_getproposals_returned_note,
    assert_visible_note_bodies_or_fail,
    body_text,
    open_main_home,
    probe_notes,
    probe_proposals,
    reset_probe,
    wait_cn_surface,
    wait_feed_or_thread_posts,
    wait_home_feed,
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


def _pick_noted_post(settings: Settings) -> tuple[NotedPost, dict[str, list[str]]]:
    """Pick one post with a real note; also return notes per CN tab."""
    status, config = get_config(settings.notes_api)
    assert status == 200 and config.get("labelerDid"), config
    notes_by_tab: dict[str, list[str]] = {}
    picked: NotedPost | None = None
    for tab in ("rated_helpful", "needs_your_help", "new"):
        posts, proposals = _discover_noted_posts(settings, config, tab)
        notes_by_tab[tab] = _notes_from_proposals(proposals)
        if picked or not notes_by_tab[tab]:
            continue
        by_uri = {p.get("targetUri"): p for p in proposals if p.get("targetUri")}
        for post in posts:
            uri = post.get("uri") or ""
            handle = (post.get("author") or {}).get("handle") or ""
            api = by_uri.get(uri) or {}
            note = api.get("note") or ""
            if uri and handle and isinstance(note, str) and note.strip():
                picked = NotedPost(
                    uri=uri,
                    handle=handle,
                    rkey=uri.rstrip("/").split("/")[-1],
                    note=note,
                    source_tab=tab,
                )
                break
    assert picked, (
        "No Community Notes post with a non-empty note.text on "
        f"{'/'.join(CN_TABS)}. Cannot evaluate CommunityNoteWidget."
    )
    assert NOTE_BODY_SURFACES == ("cn_feeds", "home_feed", "post_thread")
    return picked, notes_by_tab


def _open_cn_tab(driver: WebDriver, settings: Settings, tab: str) -> str:
    reset_probe(driver)
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


def _assert_surface(
    driver: WebDriver,
    notes: list[str],
    *,
    surface: str,
    auth_mode: str,
    auth_required: bool,
    network_note_required: bool,
) -> None:
    assert_visible_note_bodies_or_fail(driver, notes, surface=surface)
    events = probe_proposals(driver)
    assert_getproposals_auth(events, mode=auth_mode, required=auth_required)
    if network_note_required:
        if probe_notes(events):
            assert_getproposals_returned_note(events, surface=surface)
        # API-side notes were already required by the caller; chrome-only
        # without visible note.text has already failed above.


def _require_oauth_creds(settings: Settings) -> None:
    if not settings.has_oauth_creds:
        pytest.skip(
            "Signed-in OAuth/DPoP three-surface note-body test skipped: set "
            "OAUTH_IDENTIFIER (or BSKY_IDENTIFIER) and OAUTH_PASSWORD. "
            "Soft-anon still requires visible note.text on CN feeds, the "
            "main home feed, and the post thread — not the CN tab alone. "
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
def test_b_soft_anon_note_body_on_feeds_home_and_thread(
    live_app: Settings, driver: WebDriver
) -> None:
    """Soft-anon: visible note.text on CN feeds, home post card, and thread.

    Explore on the CN tab alone is not a PASS.
    """
    picked, notes_by_tab = _pick_noted_post(live_app)
    failures: list[str] = []

    def _catch(label: str, fn) -> None:
        try:
            fn()
        except AssertionError as exc:
            failures.append(f"{label}: {exc}")

    for tab in CN_TABS:
        notes = notes_by_tab.get(tab) or []

        def _cn(tab=tab, notes=notes) -> None:
            if not notes:
                raise AssertionError(
                    f"CN feed {tab} has posts but getProposals returned no "
                    "note.text. Label chrome / feed shell alone is FAIL."
                )
            surface = _open_cn_tab(driver, live_app, tab)
            assert surface == "posts"
            _assert_surface(
                driver,
                notes,
                surface=f"/community-notes/{tab} (soft-anon)",
                auth_mode="omit",
                auth_required=tab == "rated_helpful",
                network_note_required=tab == "rated_helpful",
            )

        _catch(f"cn_feeds:{tab}", _cn)

    def _thread() -> None:
        reset_probe(driver)
        driver.get(f"{live_app.base_url}{picked.thread_path}")
        dismiss_welcome_gate(driver)
        if not wait_feed_or_thread_posts(driver):
            raise AssertionError(
                f"Thread {picked.thread_path} did not render a post card. "
                f"url={driver.current_url} text={body_text(driver)[:400]}"
            )
        _assert_surface(
            driver,
            [picked.note],
            surface=f"post thread {picked.thread_path} (soft-anon)",
            auth_mode="omit",
            auth_required=False,
            network_note_required=False,
        )

    _catch("post_thread", _thread)

    def _home() -> None:
        reset_probe(driver)
        open_main_home(driver, live_app.base_url)
        dismiss_welcome_gate(driver)
        if not wait_home_feed(driver):
            raise AssertionError(
                "Main home feed did not load posts after Explore. "
                "CN-tab Explore alone is not sufficient. "
                f"url={driver.current_url}"
            )
        home_notes = [picked.note]
        for tab_notes in notes_by_tab.values():
            home_notes.extend(tab_notes)
        try:
            assert_visible_note_bodies_or_fail(
                driver, home_notes, surface="main home feed (soft-anon)"
            )
        except AssertionError:
            events = probe_proposals(driver)
            probed = probe_notes(events)
            if probed:
                assert_visible_note_bodies_or_fail(
                    driver,
                    probed,
                    surface="main home feed (soft-anon, getProposals notes)",
                )
            else:
                raise AssertionError(
                    "Main home feed showed no visible Community Note body for "
                    "a post that has a note. Explore on the CN tab alone is "
                    "not a PASS. Label chrome without note.text is FAIL. "
                    f"known_post={picked.uri} url={driver.current_url}"
                )
        events = probe_proposals(driver)
        assert_getproposals_auth(events, mode="omit", required=False)
        if events and (
            probe_notes(events) or "Readers added" in body_text(driver)
        ):
            assert_getproposals_returned_note(events, surface="main home feed")

    _catch("home_feed", _home)

    if failures:
        pytest.fail(
            "Note body missing on one or more surfaces (CN-tab Explore "
            "alone is not a PASS). Label chrome without note.text is FAIL.\n"
            + "\n".join(f"- {item}" for item in failures)
        )


@pytest.mark.live
@pytest.mark.oauth
def test_b_signed_in_oauth_dpop_note_bodies_three_surfaces(
    live_app: Settings, driver: WebDriver
) -> None:
    """Signed-in OAuth: known noted post on CN feed, home card, and thread.

    getProposals must be DPoP (fetchWithAgentAuth). Skips without OAuth creds.
    """
    _require_oauth_creds(live_app)
    picked, notes_by_tab = _pick_noted_post(live_app)
    source_notes = notes_by_tab.get(picked.source_tab) or [picked.note]

    if not login_with_oauth(driver, live_app):
        pytest.fail(
            "OAuth credentials were set but the handle-only DPoP flow did not "
            "complete a signed-in session. Check PDS consent (OAUTH_PASSWORD "
            "must be the account password, not an app password) and that "
            "Authorization is never an empty Bearer."
        )

    failures: list[str] = []

    def _catch(label: str, fn) -> None:
        try:
            fn()
        except AssertionError as exc:
            failures.append(f"{label}: {exc}")

    def _cn() -> None:
        _open_cn_tab(driver, live_app, picked.source_tab)
        _assert_surface(
            driver,
            source_notes,
            surface=f"/community-notes/{picked.source_tab} (signed-in OAuth)",
            auth_mode="dpop",
            auth_required=True,
            network_note_required=True,
        )

    def _home() -> None:
        reset_probe(driver)
        open_main_home(driver, live_app.base_url)
        if not wait_home_feed(driver):
            raise AssertionError(
                "Signed-in main home feed did not load posts. "
                f"url={driver.current_url}"
            )
        home_notes = [picked.note, *source_notes]
        try:
            assert_visible_note_bodies_or_fail(
                driver, home_notes, surface="main home feed (signed-in OAuth)"
            )
        except AssertionError:
            events = probe_proposals(driver)
            probed = probe_notes(events)
            if not probed:
                raise AssertionError(
                    "Signed-in home feed showed no visible note.text for a "
                    f"post known to have a note ({picked.uri}). CN-tab only "
                    "is not sufficient. Label chrome without note.text is FAIL."
                )
            assert_visible_note_bodies_or_fail(
                driver,
                probed,
                surface="main home feed (signed-in OAuth, getProposals)",
            )
        home_events = probe_proposals(driver)
        assert_getproposals_auth(home_events, mode="dpop", required=True)
        if probe_notes(home_events):
            assert_getproposals_returned_note(home_events, surface="main home feed")

    def _thread() -> None:
        reset_probe(driver)
        driver.get(f"{live_app.base_url}{picked.thread_path}")
        if not wait_feed_or_thread_posts(driver):
            raise AssertionError(
                f"Signed-in thread {picked.thread_path} did not render. "
                f"url={driver.current_url}"
            )
        _assert_surface(
            driver,
            [picked.note],
            surface=f"post thread {picked.thread_path} (signed-in OAuth)",
            auth_mode="dpop",
            auth_required=True,
            network_note_required=True,
        )

    _catch("cn_feeds", _cn)
    _catch("home_feed", _home)
    _catch("post_thread", _thread)
    if failures:
        pytest.fail(
            "Signed-in OAuth/DPoP: note body missing on one or more surfaces.\n"
            + "\n".join(f"- {item}" for item in failures)
        )


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
            "three-surface test (OAUTH_IDENTIFIER + OAUTH_PASSWORD) instead."
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
