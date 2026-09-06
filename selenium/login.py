"""Login helpers.

- Soft-anon: dismiss the beta welcome modal via Explore without signing in.
- OAuth: handle-only form → PDS consent → DPoP session (not “Use password
  instead”). Skipped by tests when OAUTH_* creds are missing.
- Password: Maestro testIDs, used only for optional propose/vote.
"""

from __future__ import annotations

import time

from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from conftest import Settings


def _click_first(driver: WebDriver, locators: list[tuple[str, str]], timeout: float = 8) -> bool:
    wait = WebDriverWait(driver, timeout)
    for by, value in locators:
        try:
            el = wait.until(EC.element_to_be_clickable((by, value)))
            el.click()
            return True
        except TimeoutException:
            continue
    return False


def dismiss_welcome_gate(driver: WebDriver, timeout: float = 2.5) -> bool:
    """Clear the logged-out beta welcome modal (soft-anon explore path)."""
    return _click_first(
        driver,
        [
            (By.XPATH, "//*[normalize-space()='Explore the app without signing in']"),
            (By.XPATH, "//*[normalize-space()='Explore the app']"),
        ],
        timeout=timeout,
    )


def _signed_in(driver: WebDriver) -> bool:
    for selector in (
        '[data-testid="bottomBarHomeBtn"]',
        '[data-testid="bottomBarProfileBtn"]',
        '[data-testid="composeFAB"]',
        '[data-testid="mobileShellView"]',
    ):
        for el in driver.find_elements(By.CSS_SELECTOR, selector):
            try:
                if el.is_displayed():
                    return True
            except Exception:
                continue
    text = driver.find_element(By.TAG_NAME, "body").text
    if "Sign in" in text and "Create account" in text and "Explore the app" in text:
        return False
    return False


def _fill_first(driver: WebDriver, locators: list[tuple[str, str]], value: str) -> bool:
    for by, loc in locators:
        els = driver.find_elements(by, loc)
        for el in els:
            try:
                if el.is_displayed():
                    el.clear()
                    el.send_keys(value)
                    return True
            except Exception:
                continue
    return False


def login_with_oauth(driver: WebDriver, settings: Settings, timeout: float = 90) -> bool:
    """Handle-only OAuth (DPoP). Does not click Use password instead."""
    if not settings.has_oauth_creds:
        return False

    base = settings.base_url
    driver.get(f"{base}/")
    dismiss_welcome_gate(driver, timeout=3)

    _click_first(
        driver,
        [
            (By.CSS_SELECTOR, '[data-testid="signInButton"]'),
            (By.XPATH, "//*[normalize-space()='Sign in']"),
            (By.XPATH, "//a[normalize-space()='Sign in']"),
        ],
        timeout=12,
    )

    wait = WebDriverWait(driver, min(timeout, 25))
    user = wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="loginUsernameInput"]'))
    )
    user.clear()
    user.send_keys(settings.oauth_identifier or "")
    # Stay on the OAuth form — do not click "Use password instead".
    driver.find_element(By.CSS_SELECTOR, '[data-testid="loginNextButton"]').click()

    deadline = time.time() + timeout
    filled_password = False
    while time.time() < deadline:
        current = driver.current_url
        if current.startswith(base) and _signed_in(driver):
            return True

        if not filled_password:
            filled_password = _fill_first(
                driver,
                [
                    (By.CSS_SELECTOR, 'input[type="password"]'),
                    (By.CSS_SELECTOR, 'input[name="password"]'),
                    (By.CSS_SELECTOR, 'input[autocomplete="current-password"]'),
                    (By.CSS_SELECTOR, '[data-testid="loginPasswordInput"]'),
                ],
                settings.oauth_password or "",
            )
            if filled_password:
                _fill_first(
                    driver,
                    [
                        (By.CSS_SELECTOR, 'input[name="identifier"]'),
                        (By.CSS_SELECTOR, 'input[name="username"]'),
                        (By.CSS_SELECTOR, 'input[autocomplete="username"]'),
                        (By.CSS_SELECTOR, '[data-testid="loginUsernameInput"]'),
                    ],
                    settings.oauth_identifier or "",
                )
                if not _click_first(
                    driver,
                    [
                        (By.CSS_SELECTOR, 'button[type="submit"]'),
                        (By.XPATH, "//button[normalize-space()='Sign in']"),
                        (By.XPATH, "//button[normalize-space()='Continue']"),
                        (By.XPATH, "//button[normalize-space()='Log in']"),
                        (By.XPATH, "//button[normalize-space()='Next']"),
                        (By.CSS_SELECTOR, '[data-testid="loginNextButton"]'),
                    ],
                    timeout=4,
                ):
                    filled_password = False

        _click_first(
            driver,
            [
                (By.XPATH, "//button[normalize-space()='Allow']"),
                (By.XPATH, "//button[normalize-space()='Authorize']"),
                (By.XPATH, "//button[contains(., 'Allow')]"),
                (By.XPATH, "//button[contains(., 'Authorize')]"),
                (By.XPATH, "//button[normalize-space()='Continue']"),
            ],
            timeout=1.2,
        )
        time.sleep(0.6)

    return _signed_in(driver)


def login_with_password(driver: WebDriver, settings: Settings, timeout: float = 30) -> bool:
    """Sign in with handle + app password. Returns True on success."""
    if not settings.identifier or not settings.password:
        return False

    driver.get(f"{settings.base_url}/")

    _click_first(
        driver,
        [
            (By.CSS_SELECTOR, '[data-testid="signInButton"]'),
            (By.XPATH, "//*[normalize-space()='Sign in']"),
        ],
        timeout=12,
    )

    _click_first(
        driver,
        [
            (By.XPATH, "//*[normalize-space()='Use password instead']"),
        ],
        timeout=6,
    )

    wait = WebDriverWait(driver, timeout)
    user = wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="loginUsernameInput"]'))
    )
    user.clear()
    user.send_keys(settings.identifier)

    try:
        password = driver.find_element(By.CSS_SELECTOR, '[data-testid="loginPasswordInput"]')
    except NoSuchElementException:
        next_btn = driver.find_element(By.CSS_SELECTOR, '[data-testid="loginNextButton"]')
        next_btn.click()
        password = wait.until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, '[data-testid="loginPasswordInput"]')
            )
        )
    password.clear()
    password.send_keys(settings.password)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="loginNextButton"]').click()

    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    '[data-testid="bottomBarHomeBtn"], [data-testid="mobileShellView"]',
                )
            )
        )
        return True
    except TimeoutException:
        return False
