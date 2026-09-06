from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions

from helpers import install_fetch_probe


@dataclass(frozen=True)
class Settings:
    base_url: str
    notes_api: str
    public_api: str
    pds: str
    headless: bool
    identifier: str | None
    password: str | None
    oauth_identifier: str | None
    oauth_password: str | None
    allow_writes: bool
    write_post_uri: str | None
    chrome_bin: str | None
    implicit_wait: float = 0.5
    page_load_timeout: float = 45

    @property
    def is_local(self) -> bool:
        host = self.base_url.split("://", 1)[-1]
        return host.startswith("127.0.0.1") or host.startswith("localhost")

    @property
    def has_oauth_creds(self) -> bool:
        return bool(self.oauth_identifier and self.oauth_password)


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_opt(*names: str) -> str | None:
    for name in names:
        value = os.environ.get(name)
        if value and value.strip():
            return value.strip()
    return None


@pytest.fixture(scope="session")
def settings() -> Settings:
    base = _env_opt("BASE_URL", "SELENIUM_BASE_URL") or "http://127.0.0.1:19006"
    identifier = _env_opt("BSKY_IDENTIFIER", "OAUTH_IDENTIFIER")
    password = _env_opt("BSKY_APP_PASSWORD", "BSKY_PASSWORD", "OAUTH_PASSWORD")
    oauth_identifier = _env_opt("OAUTH_IDENTIFIER", "BSKY_IDENTIFIER")
    oauth_password = _env_opt("OAUTH_PASSWORD", "BSKY_PASSWORD")
    is_local = "127.0.0.1" in base or "localhost" in base
    allow = _env_flag("SMOKE_ALLOW_WRITES", default=is_local)
    return Settings(
        base_url=base.rstrip("/"),
        notes_api=(
            _env_opt("NOTES_API_URL", "COMMUNITY_NOTES_SERVICE")
            or "https://api.bluenotes.social"
        ).rstrip("/"),
        public_api=(_env_opt("BSKY_PUBLIC_API") or "https://public.api.bsky.app").rstrip(
            "/"
        ),
        pds=(_env_opt("BSKY_PDS", "ATP_PDS") or "https://bsky.social").rstrip("/"),
        headless=_env_flag("SELENIUM_HEADLESS", default=True),
        identifier=identifier,
        password=password,
        oauth_identifier=oauth_identifier,
        oauth_password=oauth_password,
        allow_writes=allow and bool(identifier and password),
        write_post_uri=_env_opt("SMOKE_WRITE_POST_URI"),
        chrome_bin=_env_opt("CHROME_BIN", "GOOGLE_CHROME_BIN"),
    )


def _url_reachable(url: str, timeout: float = 5) -> bool:
    try:
        urllib.request.urlopen(url, timeout=timeout)
        return True
    except Exception:
        return False


@pytest.fixture(scope="session")
def live_app(settings: Settings) -> Settings:
    if not _url_reachable(settings.base_url):
        pytest.skip(
            f"App not reachable at {settings.base_url}. Start `just web` "
            f"(port 19006) or set BASE_URL=https://bluenotes.social."
        )
    return settings


def _chrome_options(settings: Settings) -> ChromeOptions:
    options = ChromeOptions()
    if settings.headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1280,900")
    options.add_argument("--disable-notifications")
    options.set_capability("goog:loggingPrefs", {"performance": "ALL"})
    if settings.chrome_bin:
        options.binary_location = settings.chrome_bin
    return options


class NetworkSniffer:
    """CDP / performance-log capture for org.opencommunitynotes.getProposals."""

    def __init__(self, driver: webdriver.Chrome):
        self.driver = driver
        self.driver.execute_cdp_cmd("Network.enable", {})

    def proposals_events(self) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        try:
            logs = self.driver.get_log("performance")
        except Exception:
            return events
        requests: dict[str, dict[str, Any]] = {}
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
                requests[request_id] = {
                    "url": url,
                    "request_id": request_id,
                    "authorization": _header(headers, "Authorization"),
                    "status": None,
                    "body": None,
                }
            elif method == "Network.responseReceived":
                response = params.get("response") or {}
                url = response.get("url") or ""
                request_id = params.get("requestId")
                if request_id in requests:
                    requests[request_id]["status"] = response.get("status")
                elif "org.opencommunitynotes.getProposals" in url:
                    requests[request_id] = {
                        "url": url,
                        "request_id": request_id,
                        "authorization": None,
                        "status": response.get("status"),
                        "body": None,
                    }
        for item in requests.values():
            request_id = item.get("request_id")
            if request_id and item.get("status") == 200:
                try:
                    body = self.driver.execute_cdp_cmd(
                        "Network.getResponseBody", {"requestId": request_id}
                    )
                    raw = body.get("body") or ""
                    item["body"] = json.loads(raw) if raw else None
                except Exception:
                    item["body"] = None
            events.append(item)
        return events


def _header(headers: dict[str, Any], name: str) -> str | None:
    for key, value in headers.items():
        if str(key).lower() == name.lower():
            return str(value) if value is not None else None
    return None


def authorization_is_empty_bearer(value: str | None) -> bool:
    if value is None:
        return False
    stripped = value.strip()
    return stripped.lower() == "bearer" or stripped.lower() == "bearer:"


@pytest.fixture
def driver(live_app: Settings) -> Iterator[webdriver.Chrome]:
    options = _chrome_options(live_app)
    chrome = webdriver.Chrome(options=options)
    chrome.set_page_load_timeout(live_app.page_load_timeout)
    chrome.implicitly_wait(live_app.implicit_wait)
    install_fetch_probe(chrome)
    try:
        yield chrome
    finally:
        chrome.quit()


@pytest.fixture
def network(driver: webdriver.Chrome) -> NetworkSniffer:
    return NetworkSniffer(driver)


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo[None]):
    outcome = yield
    report = outcome.get_result()
    if report.when != "call" or not report.failed:
        return
    chrome = item.funcargs.get("driver")
    if chrome is None:
        return
    artifacts = Path(__file__).resolve().parent / "artifacts"
    artifacts.mkdir(exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    path = artifacts / f"{item.name}-{stamp}.png"
    try:
        chrome.save_screenshot(str(path))
    except Exception:
        pass


__all__ = ["Settings", "NetworkSniffer", "authorization_is_empty_bearer"]
