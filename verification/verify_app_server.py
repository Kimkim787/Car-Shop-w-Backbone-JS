import os
import time
import subprocess
from playwright.sync_api import Page, expect, sync_playwright

def verify_shop_flow(page: Page):
    # Using localhost since we have a Flask server now
    base_url = "http://127.0.0.1:3000"

    print(f"Navigating to: {base_url}")
    page.goto(base_url)

    # 1. Verify Login Page
    print("Verifying Login Page...")
    expect(page.get_by_role("heading", name="Login")).to_be_visible()

    # 2. Register a new user
    print("Registering new user...")
    page.get_by_role("link", name="Register").click()
    expect(page.get_by_role("heading", name="Register")).to_be_visible()

    page.fill("#reg-username", "jules_server")
    page.fill("#reg-password", "testpass")
    page.fill("#reg-fullname", "Jules Server Test")
    page.fill("#reg-address", "Server Lane 123")
    page.get_by_role("button", name="Register").click()

    # 3. Verify Shop Page loads
    print("Verifying Shop Page...")
    expect(page.get_by_role("heading", name="Shop Products")).to_be_visible()
    expect(page.get_by_text("Welcome, Jules Server Test")).to_be_visible()

    # 4. Take Screenshot
    cwd = os.getcwd()
    screenshot_path = f"{cwd}/verification/shop_server_verification.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

if __name__ == "__main__":
    # Ensure server is running
    # In this environment, I started it earlier in background, but good to be robust
    # I'll assume it's running on port 3000 as per previous steps.

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_shop_flow(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
