"""Detect the known Community Notes false PASS.

The Helpful / Needs-your-help feeds can render:

1. Posts (feed shell)
2. Widget chrome — helpful “Readers added context…” vs proposed
   “Rate proposed Community Notes”
3. The CommunityNoteWidget **note body** (``proposal.note``)

A previous manual bot treated (1)+(2) as PASS. That is wrong: labels chrome
alone does not mean notes loaded. PASS requires (3) whenever getProposals
returned a non-empty ``note`` field (or chrome is visible at all).

Helpful vs proposed must look different. Label-only chrome, or chrome of
the other mode, is FAIL even when a note body is present.
"""

from __future__ import annotations

import re
from typing import Any, Iterable, Literal

# CommunityNoteWidget / RateProposedNotesPrompt on community-notes-feature.
HELPFUL_CHROME_PHRASES = (
    "Readers added context they thought people might want to know",
    "Readers added context",
    "Do you find this helpful?",
)

PROPOSED_CHROME_PHRASES = (
    "Rate proposed Community Notes",
    "Is this proposed note helpful?",
    "Needs ratings",
    "Not shown on",
)

# Union: any widget chrome, used for the chrome-without-body FAIL.
WIDGET_CHROME_PHRASES = HELPFUL_CHROME_PHRASES + PROPOSED_CHROME_PHRASES

# Fallback mapping text from mapProposalApiResponseToCommunityNote when
# apiNote.note is missing. That is not a real body either.
FALLBACK_BODY_PREFIX = "Context note for "

NoteMode = Literal["helpful", "proposed"]

TAB_NOTE_MODE: dict[str, NoteMode] = {
    "rated_helpful": "helpful",
    "needs_your_help": "proposed",
    "new": "proposed",
}

HELPFUL_LABEL = "annotation"
PROPOSED_LABEL = "proposed-annotation"


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _shows_any(page_text: str, phrases: Iterable[str]) -> bool:
    text = normalize_text(page_text)
    return any(phrase in text for phrase in phrases)


def page_shows_widget_chrome(page_text: str) -> bool:
    return _shows_any(page_text, WIDGET_CHROME_PHRASES)


def page_shows_helpful_chrome(page_text: str) -> bool:
    return _shows_any(page_text, HELPFUL_CHROME_PHRASES)


def page_shows_proposed_chrome(page_text: str) -> bool:
    return _shows_any(page_text, PROPOSED_CHROME_PHRASES)


def note_snippet(note: str, min_len: int = 24) -> str:
    """Pick a distinctive body snippet that is not chrome and not only a URL."""
    if not note or not note.strip():
        return ""
    for raw_line in note.splitlines():
        line = normalize_text(raw_line)
        if not line:
            continue
        if re.fullmatch(r"https?://\S+", line):
            continue
        # Prefer the explanation, not a trailing bare URL on the same line.
        without_urls = normalize_text(re.sub(r"https?://\S+", "", line))
        candidate = without_urls or line
        if len(candidate) >= min_len:
            return candidate[: max(min_len, min(48, len(candidate)))]
        if candidate:
            return candidate
    collapsed = normalize_text(note)
    return collapsed[:min_len] if collapsed else ""


def page_shows_note_body(page_text: str, note: str) -> bool:
    snippet = note_snippet(note)
    if not snippet:
        return False
    if snippet.startswith(FALLBACK_BODY_PREFIX):
        return False
    return snippet in normalize_text(page_text)


def nonempty_notes(notes: list[str] | tuple[str, ...]) -> list[str]:
    out: list[str] = []
    for note in notes:
        if isinstance(note, str) and note.strip() and not note.strip().startswith(
            FALLBACK_BODY_PREFIX
        ):
            out.append(note)
    return out


def infer_note_mode(
    *,
    status: str | None = None,
    val: str | None = None,
    labels: Iterable[Any] | None = None,
    tab: str | None = None,
) -> NoteMode | None:
    """Map API status / labeler val / post labels / CN tab to a display mode."""
    if status == "rated_helpful":
        return "helpful"
    if status == "needs_more_ratings":
        return "proposed"
    if val == PROPOSED_LABEL:
        return "proposed"
    label_vals: set[str] = set()
    for lab in labels or []:
        if isinstance(lab, dict) and lab.get("val"):
            label_vals.add(str(lab["val"]))
        elif isinstance(lab, str) and lab:
            label_vals.add(lab)
    if PROPOSED_LABEL in label_vals and HELPFUL_LABEL not in label_vals:
        return "proposed"
    if HELPFUL_LABEL in label_vals:
        return "helpful"
    if val == HELPFUL_LABEL:
        return "helpful"
    if tab in TAB_NOTE_MODE:
        return TAB_NOTE_MODE[tab]
    return None


def is_chrome_only_false_pass(page_text: str, notes: list[str] | tuple[str, ...]) -> bool:
    """True when chrome is on screen but no proposal note body is."""
    if not page_shows_widget_chrome(page_text):
        return False
    return not any(page_shows_note_body(page_text, note) for note in nonempty_notes(notes))


def assert_note_bodies_rendered(page_text: str, notes: list[str] | tuple[str, ...]) -> None:
    """Fail when labels/feed chrome appear without Community Note body text."""
    bodies = nonempty_notes(notes)
    chrome = page_shows_widget_chrome(page_text)
    rendered = any(page_shows_note_body(page_text, note) for note in bodies)

    if chrome and not rendered:
        raise AssertionError(
            "Community Notes chrome (Readers Added Context / Rate Proposed) is "
            "visible but no Community Note body text is rendered. Label chrome "
            "alone is not a PASS."
        )
    if bodies and not rendered:
        snippets = ", ".join(repr(note_snippet(n)) for n in bodies[:3])
        raise AssertionError(
            "getProposals returned note body text but CommunityNoteWidget did "
            f"not render it. Expected snippets: {snippets}"
        )
    if chrome and not bodies:
        raise AssertionError(
            "Community Notes chrome is visible but getProposals returned no "
            "note bodies. Labels chrome alone is not a PASS."
        )


def assert_note_mode_and_body(
    page_text: str,
    notes: list[str] | tuple[str, ...],
    mode: NoteMode,
) -> None:
    """Require note body plus chrome that matches helpful vs proposed.

    Helpful (``annotation`` / ``rated_helpful``): “Readers added context”
    style — not the rate-proposed prompt as primary chrome.

    Proposed (``proposed-annotation`` / ``needs_more_ratings``): note body
    plus “Is this proposed note helpful?” — not the helpful-context
    presentation.

    One mode's chrome is never a PASS for the other.
    """
    assert_note_bodies_rendered(page_text, notes)
    helpful = page_shows_helpful_chrome(page_text)
    proposed = page_shows_proposed_chrome(page_text)

    if mode == "helpful":
        if proposed and not helpful:
            raise AssertionError(
                "Rated helpful note (annotation / rated_helpful) shows "
                "rate-proposed UX as primary chrome. Helpful vs proposed "
                "must look different. Expected “Readers added context”, not "
                "“Is this proposed note helpful?”."
            )
        if not helpful:
            raise AssertionError(
                "Rated helpful note body is missing “Readers added context” "
                "chrome. Label-only or mode-mismatched chrome is FAIL."
            )
        if proposed:
            raise AssertionError(
                "Rated helpful note also shows rate-proposed chrome "
                "(“Is this proposed note helpful?” / “Rate proposed "
                "Community Notes”). Helpful vs proposed must look different; "
                "one mode's chrome is not a PASS for the other."
            )
        return

    if mode == "proposed":
        if helpful and not proposed:
            raise AssertionError(
                "Proposed note (proposed-annotation / needs_more_ratings) "
                "shows helpful-context presentation as primary chrome. "
                "Expected “Is this proposed note helpful?”, not "
                "“Readers added context”."
            )
        if not proposed:
            raise AssertionError(
                "Proposed note body is missing rate-proposed UX "
                "(“Is this proposed note helpful?”). Label-only or "
                "mode-mismatched chrome is FAIL."
            )
        if helpful:
            raise AssertionError(
                "Proposed note also shows “Readers added context” chrome. "
                "Helpful vs proposed must look different; one mode's chrome "
                "is not a PASS for the other."
            )
        return

    raise AssertionError(f"Unknown Community Notes mode: {mode!r}")
