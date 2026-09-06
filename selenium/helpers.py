"""Shared live-test helpers: visible body, fetch probe, CN navigation."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Literal

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait

from assertions import (
    NoteMode,
    assert_note_bodies_rendered,
    assert_note_mode_and_body,
    is_chrome_only_false_pass,
    note_snippet,
    nonempty_notes,
    page_shows_widget_chrome,
)

AuthMode = Literal["omit", "dpop"]

# Anywhere a post with a note is shown — CN-tab Explore alone is not enough.
NOTE_BODY_SURFACES = (
    "cn_feeds",
    "home_feed",
    "post_thread",
)


@dataclass(frozen=True)
class NotedPost:
    uri: str
    handle: str
    rkey: str
    note: str
    source_tab: str
    mode: NoteMode
    status: str = ""
    val: str = ""

    @property
    def thread_path(self) -> str:
        return f"/profile/{self.handle}/post/{self.rkey}"

    @property
    def feed_item_testid(self) -> str:
        return f"feedItem-by-{self.handle}"

# Injected before any page script so we see fetchWithAgentAuth headers.
FETCH_PROBE_JS = """
(() => {
  const g = (window.__cnSmoke = window.__cnSmoke || {proposals: []});
  const orig = window.fetch.bind(window);
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const hdrs = new Headers((init && init.headers) || {});
    if (input && typeof input !== 'string' && input.headers) {
      try {
        new Headers(input.headers).forEach((v, k) => {
          if (!hdrs.has(k)) hdrs.set(k, v);
        });
      } catch (e) {}
    }
    const authorization = hdrs.get('Authorization');
    const dpop = hdrs.get('DPoP');
    const ret = orig(input, init);
    if (url && url.indexOf('org.opencommunitynotes.getProposals') !== -1) {
      return Promise.resolve(ret).then((res) => {
        const record = {
          url: url,
          authorization: authorization,
          dpop: dpop,
          status: res && res.status,
          notes: [],
        };
        return res
          .clone()
          .json()
          .then((body) => {
            const proposals = (body && body.proposals ? body.proposals : []) || [];
            record.notes = proposals
              .map((p) => p && p.note)
              .filter((n) => typeof n === 'string' && n.trim());
            record.proposalMeta = proposals
              .filter((p) => p && typeof p.note === 'string' && p.note.trim())
              .map((p) => ({
                note: p.note,
                status: p.status || '',
                val: p.val || '',
                targetUri: p.targetUri || '',
              }));
            g.proposals.push(record);
            return res;
          })
          .catch(() => {
            g.proposals.push(record);
            return res;
          });
      });
    }
    return ret;
  };
})();
"""

NOTE_BODY_VISIBLE_JS = """
const snippet = arguments[0];
if (!snippet) return false;
const welcome = [...document.querySelectorAll('div,section,aside')].find((el) => {
  const t = (el.innerText || '');
  return t.includes('Welcome to the Bluenotes') && t.length < 1800;
});
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
let n;
while ((n = walker.nextNode())) {
  const raw = (n.textContent || '').replace(/\\s+/g, ' ');
  if (raw.indexOf(snippet) === -1) continue;
  const el = n.parentElement;
  if (!el) continue;
  if (welcome && welcome.contains(el)) continue;
  if (el.closest('[aria-modal="true"]')) continue;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') continue;
  if (parseFloat(style.opacity || '1') === 0) continue;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) continue;
  return true;
}
return false;
"""

CARD_TEXT_FOR_NOTE_JS = """
const snippet = arguments[0];
if (!snippet) return '';
const welcome = [...document.querySelectorAll('div,section,aside')].find((el) => {
  const t = (el.innerText || '');
  return t.includes('Welcome to the Bluenotes') && t.length < 1800;
});
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
let n;
while ((n = walker.nextNode())) {
  const raw = (n.textContent || '').replace(/\\s+/g, ' ');
  if (raw.indexOf(snippet) === -1) continue;
  const start = n.parentElement;
  if (!start) continue;
  if (welcome && welcome.contains(start)) continue;
  if (start.closest('[aria-modal="true"]')) continue;
  const style = window.getComputedStyle(start);
  if (style.display === 'none' || style.visibility === 'hidden') continue;
  if (parseFloat(style.opacity || '1') === 0) continue;
  const r = start.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) continue;
  let el = start;
  while (el && el !== document.body) {
    const tid = (el.getAttribute && el.getAttribute('data-testid')) || '';
    if (tid.startsWith('feedItem-by-') || tid.startsWith('postThreadItem-by-')) {
      return (el.innerText || '').replace(/\\s+/g, ' ');
    }
    el = el.parentElement;
  }
  return (start.innerText || '').replace(/\\s+/g, ' ');
}
return '';
"""

VISIBLE_TEXT_JS = """
const welcome = [...document.querySelectorAll('div,section,aside')].find((el) => {
  const t = (el.innerText || '');
  return t.includes('Welcome to the Bluenotes') && t.length < 1800;
});
const parts = [];
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
let n;
while ((n = walker.nextNode())) {
  const el = n.parentElement;
  if (!el) continue;
  if (welcome && welcome.contains(el)) continue;
  if (el.closest('[aria-modal="true"]')) continue;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') continue;
  if (parseFloat(style.opacity || '1') === 0) continue;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) continue;
  const t = (n.textContent || '').replace(/\\s+/g, ' ').trim();
  if (t) parts.push(t);
}
return parts.join(' ');
"""


def install_fetch_probe(driver: WebDriver) -> None:
    driver.execute_cdp_cmd("Page.enable", {})
    driver.execute_cdp_cmd("Network.enable", {})
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument", {"source": FETCH_PROBE_JS}
    )


def reset_probe(driver: WebDriver) -> None:
    driver.execute_script(
        "if (window.__cnSmoke) window.__cnSmoke.proposals = [];"
    )


def probe_notes(events: list[dict[str, Any]]) -> list[str]:
    notes: list[str] = []
    for event in events:
        for note in event.get("notes") or []:
            if isinstance(note, str) and note.strip():
                notes.append(note)
    return notes


def probe_proposal_meta(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    meta: list[dict[str, Any]] = []
    for event in events:
        rows = event.get("proposalMeta") or []
        if rows:
            meta.extend(row for row in rows if isinstance(row, dict))
            continue
        for note in event.get("notes") or []:
            if isinstance(note, str) and note.strip():
                meta.append({"note": note, "status": "", "val": "", "targetUri": ""})
    return meta


def assert_getproposals_returned_note(
    events: list[dict[str, Any]], *, surface: str
) -> None:
    if not probe_notes(events):
        raise AssertionError(
            f"getProposals on {surface} did not return proposals[].note "
            "(need HTTP 200 with a non-empty note). Label chrome without "
            f"note.text is FAIL. url events={redact_probe_events(events)!r}"
        )


def probe_proposals(driver: WebDriver) -> list[dict[str, Any]]:
    data = driver.execute_script(
        "return (window.__cnSmoke && window.__cnSmoke.proposals) || []"
    )
    events = list(data or [])
    if events:
        return events
    return _proposals_from_performance_logs(driver)


def _header_ci(headers: dict[str, Any], name: str) -> str | None:
    for key, value in headers.items():
        if str(key).lower() == name.lower():
            return str(value) if value is not None else None
    return None


def _proposals_from_performance_logs(driver: WebDriver) -> list[dict[str, Any]]:
    try:
        logs = driver.get_log("performance")
    except Exception:
        return []
    found: dict[str, dict[str, Any]] = {}
    for entry in logs:
        try:
            message = json.loads(entry["message"])["message"]
        except (KeyError, TypeError, json.JSONDecodeError):
            continue
        method = message.get("method")
        params = message.get("params") or {}
        if method == "Network.requestWillBeSent":
            request = params.get("request") or {}
            url = request.get("url") or ""
            if "org.opencommunitynotes.getProposals" not in url:
                continue
            request_id = params.get("requestId")
            headers = request.get("headers") or {}
            found[request_id] = {
                "url": url,
                "authorization": _header_ci(headers, "Authorization"),
                "dpop": _header_ci(headers, "DPoP"),
                "status": None,
            }
        elif method == "Network.responseReceived":
            response = params.get("response") or {}
            url = response.get("url") or ""
            request_id = params.get("requestId")
            if request_id in found:
                found[request_id]["status"] = response.get("status")
            elif "org.opencommunitynotes.getProposals" in url:
                found[request_id] = {
                    "url": url,
                    "authorization": None,
                    "dpop": None,
                    "status": response.get("status"),
                }
    return list(found.values())


def visible_page_text(driver: WebDriver) -> str:
    try:
        return str(driver.execute_script(VISIBLE_TEXT_JS) or "")
    except Exception:
        try:
            return driver.find_element(By.TAG_NAME, "body").text
        except Exception:
            return ""


def note_body_is_visible(driver: WebDriver, note: str) -> bool:
    snippet = note_snippet(note)
    if not snippet:
        return False
    try:
        return bool(driver.execute_script(NOTE_BODY_VISIBLE_JS, snippet))
    except Exception:
        return snippet in visible_page_text(driver)


def any_note_body_visible(driver: WebDriver, notes: list[str]) -> bool:
    return any(note_body_is_visible(driver, note) for note in nonempty_notes(notes))


def visible_card_text(driver: WebDriver, note: str) -> str:
    """Visible text of the feed/thread card that contains this note body."""
    snippet = note_snippet(note)
    if not snippet:
        return ""
    try:
        return str(driver.execute_script(CARD_TEXT_FOR_NOTE_JS, snippet) or "")
    except Exception:
        return ""


def redact_authorization(value: str | None) -> str:
    """Scheme-only auth for assertion text. Never interpolate raw tokens."""
    if value is None or not str(value).strip():
        return "absent"
    stripped = str(value).strip()
    lower = stripped.lower()
    if lower in {"bearer", "bearer:"}:
        return "Bearer <empty>"
    if lower.startswith("dpop "):
        return "DPoP <redacted>"
    if lower.startswith("bearer "):
        return "Bearer <redacted>"
    return "present"


def redact_probe_event(event: dict[str, Any]) -> dict[str, Any]:
    """Copy a getProposals probe record with tokens stripped."""
    out = dict(event)
    if "authorization" in out:
        out["authorization"] = redact_authorization(out.get("authorization"))
    if "dpop" in out:
        out["dpop"] = "present" if out.get("dpop") else "absent"
    return out


def redact_probe_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [redact_probe_event(event) for event in events]


def authorization_is_empty_bearer(value: str | None) -> bool:
    if value is None:
        return False
    stripped = value.strip()
    return stripped.lower() in {"bearer", "bearer:"}


def authorization_is_dpop(value: str | None) -> bool:
    return bool(value) and value.strip().lower().startswith("dpop ")


def assert_getproposals_auth(
    events: list[dict[str, Any]],
    *,
    mode: AuthMode,
    required: bool = True,
) -> None:
    if not events:
        if required:
            raise AssertionError(
                "Expected org.opencommunitynotes.getProposals network calls "
                f"with auth mode {mode!r}."
            )
        return
    for event in events:
        auth = event.get("authorization")
        url = event.get("url") or ""
        # Raise (do not `assert` on raw auth) so pytest rewriting cannot
        # dump DPoP / Bearer tokens into CI logs.
        if "uris=" not in url:
            raise AssertionError(f"getProposals missing uris=: {url}")
        if authorization_is_empty_bearer(auth):
            raise AssertionError(
                "App sent Authorization: Bearer  (empty). "
                "fetchWithAgentAuth must omit the header (soft-anon) or send "
                f"DPoP / a real JWT. url={url}"
            )
        status = event.get("status")
        if status is not None and status != 200:
            raise AssertionError(f"getProposals HTTP {status} {url}")
        observed = redact_authorization(auth)
        if mode == "omit" and auth:
            raise AssertionError(
                "Soft-anon Explore must omit Authorization on getProposals "
                f"(observed {observed}). url={url}"
            )
        if mode == "dpop" and not authorization_is_dpop(auth):
            raise AssertionError(
                "Signed-in OAuth getProposals must use Authorization: DPoP "
                "<token> (fetchWithAgentAuth). Observed "
                f"{observed}. url={url}"
            )


def body_text(driver: WebDriver) -> str:
    try:
        return driver.find_element(By.TAG_NAME, "body").text
    except Exception:
        return driver.page_source


def wait_cn_surface(driver: WebDriver, timeout: float = 40) -> str:
    """Return posts | empty | error | splash once the CN route settles."""
    driver.implicitly_wait(0)
    deadline = time.time() + timeout
    last = "loading"
    try:
        while time.time() < deadline:
            text = body_text(driver)
            if driver.find_elements(By.CSS_SELECTOR, '[data-testid^="feedItem-by-"]'):
                return "posts"
            feed_shell = bool(
                driver.find_elements(By.CSS_SELECTOR, '[data-testid="communityNotesFeed"]')
            )
            if feed_shell and "This feed is empty." in text:
                return "empty"
            if "This feed is empty." in text and "Community Notes" in text:
                last = "empty"
            err_testid = bool(
                driver.find_elements(
                    By.CSS_SELECTOR, '[data-testid="communityNotesFeedScreenError"]'
                )
            )
            if err_testid or "Could not load feed" in text:
                last = "error"
            elif driver.find_elements(By.CSS_SELECTOR, '[data-testid="noSessionView"]'):
                if "Community Notes" in text or "Readers added" in text:
                    last = "loading"
                else:
                    last = "splash"
            time.sleep(0.4)
        return last
    finally:
        driver.implicitly_wait(0.5)


def wait_visible_note_bodies(
    driver: WebDriver, notes: list[str], timeout: float = 28
) -> str:
    deadline = time.time() + timeout
    last = ""
    while time.time() < deadline:
        last = visible_page_text(driver)
        if any_note_body_visible(driver, notes):
            return last
        driver.execute_script("window.scrollBy(0, 500)")
        time.sleep(0.4)
    return last


def assert_visible_note_bodies_or_fail(
    driver: WebDriver,
    notes: list[str],
    *,
    surface: str,
    mode: NoteMode | None = None,
    exclusive: bool = False,
    notes_with_modes: list[tuple[str, NoteMode]] | None = None,
) -> None:
    """Fail on label-only chrome or chrome that does not match helpful/proposed."""
    visible = wait_visible_note_bodies(driver, notes)
    if is_chrome_only_false_pass(visible, notes) or (
        page_shows_widget_chrome(visible) and not any_note_body_visible(driver, notes)
    ):
        raise AssertionError(
            "FALSE PASS: Readers Added Context / Rate Proposed chrome is "
            f"visible on {surface} but no Community Note body text is "
            "visibly rendered. Label chrome / feed shell alone is not a PASS. "
            f"url={driver.current_url}"
        )
    if nonempty_notes(notes) and not any_note_body_visible(driver, notes):
        snippets = ", ".join(repr(note_snippet(n)) for n in nonempty_notes(notes)[:3])
        raise AssertionError(
            f"getProposals returned note bodies but none are visible on {surface}. "
            f"Expected snippets: {snippets}. url={driver.current_url}"
        )
    assert_note_bodies_rendered(visible, notes)

    pairs: list[tuple[str, NoteMode]] = list(notes_with_modes or [])
    if mode is not None and not pairs:
        pairs = [(note, mode) for note in nonempty_notes(notes)]

    if exclusive and mode is not None:
        assert_note_mode_and_body(visible, notes, mode)
        return

    if not pairs:
        return

    matched = 0
    for note, note_mode in pairs:
        if not note_body_is_visible(driver, note):
            continue
        card = visible_card_text(driver, note)
        scoped = card or visible
        assert_note_mode_and_body(scoped, [note], note_mode)
        matched += 1
    if matched == 0 and pairs:
        modes = sorted({m for _, m in pairs})
        raise AssertionError(
            f"No note body with matching helpful/proposed chrome on {surface}. "
            f"Expected modes {modes}. One mode's chrome is not a PASS for the "
            f"other. url={driver.current_url}"
        )


def open_community_notes_nav(driver: WebDriver, base_url: str) -> None:
    """Use in-app Helpful-home / CN nav chrome (not a raw URL)."""
    clicked = False
    for by, value in (
        (By.CSS_SELECTOR, '[data-testid="bottomBarCommunityNotesBtn"]'),
        (By.CSS_SELECTOR, 'a[href="/community-notes/feeds"]'),
        (By.CSS_SELECTOR, 'a[href*="/community-notes/"]'),
        (By.XPATH, "//a[normalize-space()='Community Notes']"),
        (By.XPATH, "//*[@role='link' and contains(., 'Community Notes')]"),
        (By.XPATH, "//*[@role='tab' and contains(., 'Community Notes')]"),
        (By.XPATH, "//*[normalize-space()='Community Notes']"),
    ):
        els = driver.find_elements(by, value)
        for el in els:
            try:
                if el.is_displayed():
                    el.click()
                    clicked = True
                    break
            except Exception:
                continue
        if clicked:
            break
    if not clicked:
        driver.get(f"{base_url}/community-notes/feeds")
    time.sleep(0.6)


def open_helpful_feed_via_nav(driver: WebDriver, base_url: str) -> None:
    open_community_notes_nav(driver, base_url)
    WebDriverWait(driver, 20).until(
        lambda d: "Helpful" in body_text(d)
        or "rated_helpful" in d.current_url
        or d.find_elements(By.CSS_SELECTOR, '[data-testid^="feed-"]')
        or d.find_elements(By.CSS_SELECTOR, '[data-testid^="feedItem-by-"]')
    )
    if "/community-notes/rated_helpful" in driver.current_url:
        return
    if driver.find_elements(By.CSS_SELECTOR, '[data-testid^="feedItem-by-"]'):
        if "Helpful" in body_text(driver) or "Readers added" in body_text(driver):
            return
    for by, value in (
        (By.CSS_SELECTOR, 'a[href="/community-notes/rated_helpful"]'),
        (By.CSS_SELECTOR, 'a[href*="rated_helpful"]'),
        (By.XPATH, "//a[contains(., 'Helpful')]"),
        (By.XPATH, "//*[contains(., 'Helpful Community Notes')]"),
    ):
        for el in driver.find_elements(by, value):
            try:
                if el.is_displayed():
                    el.click()
                    time.sleep(0.4)
                    return
            except Exception:
                continue
    driver.get(f"{base_url}/community-notes/rated_helpful")


def wait_feed_or_thread_posts(driver: WebDriver, timeout: float = 35) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if driver.find_elements(By.CSS_SELECTOR, '[data-testid^="feedItem-by-"]'):
            return True
        if driver.find_elements(By.CSS_SELECTOR, '[data-testid^="postThreadItem-by-"]'):
            return True
        if "Readers added" in body_text(driver) or "Rate proposed" in body_text(driver):
            return True
        time.sleep(0.4)
    return False


def open_main_home(driver: WebDriver, base_url: str) -> None:
    """Main Discover/Following home feed — not the Community Notes tab."""
    driver.get(f"{base_url}/")
    time.sleep(0.3)


def wait_home_feed(driver: WebDriver, timeout: float = 35) -> bool:
    return wait_feed_or_thread_posts(driver, timeout=timeout)
