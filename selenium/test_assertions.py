"""Offline proof that chrome-only Community Notes UI is a FAIL.

These tests do not start Chrome or hit BASE_URL. They encode the standing
product bar: labels / “Readers Added Context” chrome without note body text
must not PASS.
"""

from __future__ import annotations

import pytest

from assertions import (
    assert_note_bodies_rendered,
    is_chrome_only_false_pass,
    note_snippet,
    page_shows_note_body,
    page_shows_widget_chrome,
)
from helpers import (
    NOTE_BODY_SURFACES,
    assert_getproposals_auth,
    authorization_is_dpop,
    authorization_is_empty_bearer,
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
