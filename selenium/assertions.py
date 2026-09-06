"""Detect the known Community Notes false PASS.

The Helpful / Needs-your-help feeds can render:

1. Posts (feed shell)
2. Widget chrome — ``Readers added context…`` / ``Rate proposed Community Notes``
3. The CommunityNoteWidget **note body** (``proposal.note``)

A previous manual bot treated (1)+(2) as PASS. That is wrong: labels chrome
alone does not mean notes loaded. PASS requires (3) whenever getProposals
returned a non-empty ``note`` field (or chrome is visible at all).

Let C = chrome visible, B = at least one note body visible.
Reject C ∧ ¬B. Also reject “getProposals returned notes but none rendered.”
"""

from __future__ import annotations

import re

# Titles from CommunityNoteWidget / RateProposedNotesPrompt on
# community-notes-feature. Matching any of these is “chrome,” not a body.
WIDGET_CHROME_PHRASES = (
    "Readers added context they thought people might want to know",
    "Readers added context",
    "Rate proposed Community Notes",
    "Is this proposed note helpful?",
    "Do you find this helpful?",
)

# Fallback mapping text from mapProposalApiResponseToCommunityNote when
# apiNote.note is missing. That is not a real body either.
FALLBACK_BODY_PREFIX = "Context note for "


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def page_shows_widget_chrome(page_text: str) -> bool:
    text = normalize_text(page_text)
    return any(phrase in text for phrase in WIDGET_CHROME_PHRASES)


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
            return candidate[:max(min_len, min(48, len(candidate)))]
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
