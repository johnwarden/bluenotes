"""Offline proof that chrome-only or mode-mismatched Community Notes UI is FAIL.

These tests do not start Chrome or hit BASE_URL. They encode the standing
product bar: labels / chrome without note body text must not PASS, and
helpful vs proposed chrome must not be treated as interchangeable.
"""

from __future__ import annotations

import pytest

from assertions import (
    assert_note_bodies_rendered,
    assert_note_mode_and_body,
    infer_note_mode,
    is_chrome_only_false_pass,
    note_snippet,
    page_shows_helpful_chrome,
    page_shows_note_body,
    page_shows_proposed_chrome,
    page_shows_widget_chrome,
)
from helpers import (
    NOTE_BODY_SURFACES,
    assert_getproposals_auth,
    assert_getproposals_returned_note,
    authorization_is_dpop,
    authorization_is_empty_bearer,
    redact_authorization,
    redact_probe_events,
)
from notes_api import auth_headers


# Feed shell + widget chrome, matching the known false PASS on
# /community-notes/rated_helpful (posts present, chrome present, no body).
CHROME_ONLY_FEED = """
Helpful Community Notes
SURPRISE — SURPRISE — SURPRISE
Trump is refusing to pay the Thames Valley Police
Readers added context they thought people might want to know
Do you find this helpful?
Rate it
Context is written by people who use Blue Notes
"""

REAL_NOTE = (
    "The Foreign Office is responsible for all costs engendered during a "
    "state visit. When extra security is required, the Government provides "
    "extra funding."
)

PROPOSED_NOTE = (
    "Spain officially recognized Palestine as a state in 2024 after "
    "years of parliamentary debate."
)

HELPFUL_FEED = f"""
Helpful Community Notes
SURPRISE — SURPRISE — SURPRISE
Readers added context they thought people might want to know
{REAL_NOTE}
Do you find this helpful?
Rate it
"""

PROPOSED_FEED = f"""
Needs your help
Rate proposed Community Notes
Not shown on Blue Notes • Needs ratings
{PROPOSED_NOTE}
Is this proposed note helpful?
"""


def test_note_body_required_on_all_three_surfaces() -> None:
    assert NOTE_BODY_SURFACES == ("cn_feeds", "home_feed", "post_thread")


def test_chrome_only_fails_on_home_and_thread_copy() -> None:
    home = """
    Following
    SURPRISE — Trump is refusing to pay
    Readers added context they thought people might want to know
    Do you find this helpful?
    """
    thread = """
    Post
    Rate proposed Community Notes
    Is this proposed note helpful?
    """
    assert is_chrome_only_false_pass(home, [REAL_NOTE])
    assert is_chrome_only_false_pass(thread, [REAL_NOTE])
    with pytest.raises(AssertionError, match="chrome"):
        assert_note_bodies_rendered(home, [REAL_NOTE])
    with pytest.raises(AssertionError, match="chrome"):
        assert_note_bodies_rendered(thread, [REAL_NOTE])


def test_chrome_phrases_are_detected() -> None:
    assert page_shows_widget_chrome(CHROME_ONLY_FEED)
    assert page_shows_widget_chrome("Rate proposed Community Notes")
    assert not page_shows_widget_chrome("Just a regular post about weather")


def test_note_snippet_skips_bare_urls() -> None:
    note = "Spain officially recognized Palestine.\nhttps://example.com/source"
    snippet = note_snippet(note)
    assert "Spain officially recognized" in snippet
    assert "http" not in snippet


def test_chrome_only_feed_is_false_pass() -> None:
    assert is_chrome_only_false_pass(CHROME_ONLY_FEED, [REAL_NOTE])


def test_chrome_plus_body_is_not_false_pass() -> None:
    page = CHROME_ONLY_FEED + "\n" + REAL_NOTE
    assert page_shows_note_body(page, REAL_NOTE)
    assert not is_chrome_only_false_pass(page, [REAL_NOTE])
    assert_note_bodies_rendered(page, [REAL_NOTE])


def test_assert_raises_on_chrome_only_false_pass() -> None:
    with pytest.raises(AssertionError, match="chrome"):
        assert_note_bodies_rendered(CHROME_ONLY_FEED, [REAL_NOTE])


def test_assert_raises_when_proposals_returned_but_widget_empty() -> None:
    feed_shell_only = "Helpful Community Notes\nSURPRISE — Trump is refusing"
    with pytest.raises(AssertionError, match="did not render"):
        assert_note_bodies_rendered(feed_shell_only, [REAL_NOTE])


def test_fallback_mapping_text_is_not_a_real_body() -> None:
    page = CHROME_ONLY_FEED + "\nContext note for annotation"
    with pytest.raises(AssertionError, match="chrome"):
        assert_note_bodies_rendered(page, ["Context note for annotation"])


def test_auth_headers_omit_empty_bearer() -> None:
    assert auth_headers(None) == {}
    assert auth_headers("") == {}
    assert auth_headers("   ") == {}
    assert auth_headers("password-jwt") == {"Authorization": "Bearer password-jwt"}


def test_dpop_and_empty_bearer_detection() -> None:
    assert authorization_is_empty_bearer("Bearer ")
    assert authorization_is_empty_bearer("Bearer")
    assert not authorization_is_empty_bearer(None)
    assert not authorization_is_empty_bearer("DPoP abc")
    assert authorization_is_dpop("DPoP abc.def")
    assert not authorization_is_dpop("Bearer abc")
    assert not authorization_is_dpop(None)


def test_getproposals_auth_omit_rejects_bearer_or_dpop() -> None:
    with pytest.raises(AssertionError, match="omit"):
        assert_getproposals_auth(
            [
                {
                    "url": "https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals?uris=at://x",
                    "authorization": "Bearer tok",
                    "status": 200,
                }
            ],
            mode="omit",
        )


def test_helpful_chrome_plus_body_is_not_proposed() -> None:
    assert page_shows_helpful_chrome(HELPFUL_FEED)
    assert not page_shows_proposed_chrome(HELPFUL_FEED)
    assert_note_mode_and_body(HELPFUL_FEED, [REAL_NOTE], "helpful")
    with pytest.raises(AssertionError, match="Readers added context"):
        assert_note_mode_and_body(HELPFUL_FEED, [REAL_NOTE], "proposed")


def test_proposed_chrome_plus_body_is_not_helpful() -> None:
    assert page_shows_proposed_chrome(PROPOSED_FEED)
    assert not page_shows_helpful_chrome(PROPOSED_FEED)
    assert_note_mode_and_body(PROPOSED_FEED, [PROPOSED_NOTE], "proposed")
    with pytest.raises(AssertionError, match="rate-proposed"):
        assert_note_mode_and_body(PROPOSED_FEED, [PROPOSED_NOTE], "helpful")


def test_helpful_body_with_proposed_chrome_fails() -> None:
    """Helpful note.text under rate-proposed chrome is not a PASS."""
    mixed = f"""
    Rate proposed Community Notes
    {REAL_NOTE}
    Is this proposed note helpful?
    """
    with pytest.raises(AssertionError, match="rate-proposed"):
        assert_note_mode_and_body(mixed, [REAL_NOTE], "helpful")
    # That same chrome is valid for a proposed note with this body.
    assert_note_mode_and_body(mixed, [REAL_NOTE], "proposed")


def test_proposed_body_with_helpful_chrome_fails() -> None:
    """Proposed note.text under Readers-added-context is not a PASS."""
    mixed = f"""
    Readers added context they thought people might want to know
    {PROPOSED_NOTE}
    Do you find this helpful?
    """
    with pytest.raises(AssertionError, match="helpful-context"):
        assert_note_mode_and_body(mixed, [PROPOSED_NOTE], "proposed")
    assert_note_mode_and_body(mixed, [PROPOSED_NOTE], "helpful")


def test_label_only_helpful_chrome_fails() -> None:
    chrome_only = """
    Readers added context they thought people might want to know
    Do you find this helpful?
    """
    with pytest.raises(AssertionError, match="chrome"):
        assert_note_mode_and_body(chrome_only, [REAL_NOTE], "helpful")


def test_label_only_proposed_chrome_fails() -> None:
    chrome_only = """
    Rate proposed Community Notes
    Is this proposed note helpful?
    """
    with pytest.raises(AssertionError, match="chrome"):
        assert_note_mode_and_body(chrome_only, [PROPOSED_NOTE], "proposed")


def test_infer_note_mode_from_status_label_and_tab() -> None:
    assert infer_note_mode(status="rated_helpful") == "helpful"
    assert infer_note_mode(status="needs_more_ratings") == "proposed"
    assert infer_note_mode(val="proposed-annotation") == "proposed"
    assert infer_note_mode(val="annotation") == "helpful"
    assert infer_note_mode(labels=[{"val": "annotation"}]) == "helpful"
    assert infer_note_mode(labels=[{"val": "proposed-annotation"}]) == "proposed"
    assert infer_note_mode(tab="rated_helpful") == "helpful"
    assert infer_note_mode(tab="needs_your_help") == "proposed"
    assert infer_note_mode(tab="new") == "proposed"
    # Status wins over a generic annotation val.
    assert (
        infer_note_mode(status="needs_more_ratings", val="annotation")
        == "proposed"
    )


def test_redact_authorization_never_leaks_tokens() -> None:
    jwt = "eyJhbGciOiJIUzI1NiJ9.payload.signature"
    dpop = f"DPoP {jwt}"
    bearer = f"Bearer {jwt}"
    assert redact_authorization(None) == "absent"
    assert redact_authorization("") == "absent"
    assert redact_authorization("Bearer ") == "Bearer <empty>"
    assert redact_authorization("Bearer") == "Bearer <empty>"
    assert redact_authorization(dpop) == "DPoP <redacted>"
    assert redact_authorization(bearer) == "Bearer <redacted>"
    assert jwt not in redact_authorization(dpop)
    assert jwt not in redact_authorization(bearer)


def test_getproposals_auth_errors_redact_tokens() -> None:
    jwt = "eyJhbGciOiJIUzI1NiJ9.payload.signature"
    with pytest.raises(AssertionError) as omit_exc:
        assert_getproposals_auth(
            [
                {
                    "url": "https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals?uris=at://x",
                    "authorization": f"Bearer {jwt}",
                    "status": 200,
                }
            ],
            mode="omit",
        )
    assert jwt not in str(omit_exc.value)
    assert "Bearer <redacted>" in str(omit_exc.value)

    with pytest.raises(AssertionError) as dpop_exc:
        assert_getproposals_auth(
            [
                {
                    "url": "https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals?uris=at://x",
                    "authorization": f"Bearer {jwt}",
                    "status": 200,
                }
            ],
            mode="dpop",
        )
    assert jwt not in str(dpop_exc.value)
    assert "Bearer <redacted>" in str(dpop_exc.value)


def test_getproposals_returned_note_errors_redact_tokens() -> None:
    jwt = "eyJhbGciOiJIUzI1NiJ9.payload.signature"
    events = [
        {
            "url": "https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals?uris=at://x",
            "authorization": f"DPoP {jwt}",
            "dpop": jwt,
            "status": 200,
            "notes": [],
        }
    ]
    redacted = redact_probe_events(events)
    assert redacted[0]["authorization"] == "DPoP <redacted>"
    assert redacted[0]["dpop"] == "present"
    assert jwt not in repr(redacted)
    with pytest.raises(AssertionError) as exc:
        assert_getproposals_returned_note(events, surface="thread")
    assert jwt not in str(exc.value)
    assert "DPoP <redacted>" in str(exc.value)


def test_getproposals_auth_dpop_rejects_empty_or_bearer() -> None:
    with pytest.raises(AssertionError, match="empty"):
        assert_getproposals_auth(
            [
                {
                    "url": "https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals?uris=at://x",
                    "authorization": "Bearer ",
                    "status": 200,
                }
            ],
            mode="dpop",
        )
    with pytest.raises(AssertionError, match="DPoP"):
        assert_getproposals_auth(
            [
                {
                    "url": "https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals?uris=at://x",
                    "authorization": "Bearer real-jwt",
                    "status": 200,
                }
            ],
            mode="dpop",
        )
    assert_getproposals_auth(
        [
            {
                "url": "https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals?uris=at://x",
                "authorization": "DPoP eyJ",
                "status": 200,
            }
        ],
        mode="dpop",
    )
