import os
from playwright.sync_api import Page, expect, sync_playwright

def verify_shop_flow(page: Page):
    # The file path to the index.html
    cwd = os.getcwd()
    file_path = f"file://{cwd}/index.html"

    print(f"Navigating to: {file_path}")
    page.goto(file_path)

    # 1. Verify Login Page
    print("Verifying Login Page...")
    expect(page.get_by_role("heading", name="Login")).to_be_visible()

    # 2. Register a new user
    print("Registering new user...")
    page.get_by_role("link", name="Register").click()
    expect(page.get_by_role("heading", name="Register")).to_be_visible()

    page.fill("#reg-username", "jules_test")
    page.fill("#reg-password", "testpass")
    page.fill("#reg-fullname", "Jules Test")
    page.fill("#reg-address", "123 Test Lane")
    page.get_by_role("button", name="Register").click()

    # 3. Verify Shop Page loads
    print("Verifying Shop Page...")
    expect(page.get_by_role("heading", name="Shop Products")).to_be_visible()
    expect(page.get_by_text("Welcome, Jules Test")).to_be_visible()

    # 4. Take Screenshot
    screenshot_path = f"{cwd}/verification/shop_verification.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_shop_flow(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
