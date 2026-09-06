"""Optional password login for write tests.

OAuth (DPoP) is not automated here — that soft-gate is a separate concern.
Password login uses the in-app “Use password instead” path and the same
testIDs as Maestro (`loginUsernameInput`, `loginPasswordInput`).
"""

from __future__ import annotations

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
