import os
import time
from playwright.sync_api import Page, expect, sync_playwright

def verify_billing_flow(page: Page):
    base_url = "http://127.0.0.1:3000"

    print(f"Navigating to: {base_url}")
    page.goto(base_url)

    # 1. Login
    page.fill("#username", "admin")
    page.fill("#password", "password123")
    page.get_by_role("button", name="Login").click()

    # Wait for redirect. Admin goes to admin/products.
    # But we need a client for billing. Let's register a new client for this test.
    page.goto(f"{base_url}/#logout")

    print("Registering new user for billing test...")
    page.goto(f"{base_url}/#register")
    page.fill("#reg-username", "bill_test")
    page.fill("#reg-password", "pass")
    page.fill("#reg-fullname", "Billing Tester")
    page.fill("#reg-address", "Bill Lane")
    page.get_by_role("button", name="Register").click()

    # 2. Go to Profile -> Billing
    print("Navigating to Billing...")
    page.get_by_role("link", name="Profile").click()
    page.get_by_role("link", name="Manage Billing Methods").click()

    # 3. Add Payment Method
    print("Adding Payment Method...")
    page.fill("#bill-alias", "My Visa")
    page.fill("#bill-card-number", "4242 4242 4242 4242")
    page.fill("#bill-card-expiry", "12/30")
    page.fill("#bill-card-cvv", "123")
    page.get_by_role("button", name="Save Payment Method").click()

    # Verify it appears in list
    expect(page.get_by_text("My Visa")).to_be_visible()

    # 4. Add item to cart and checkout
    print("Adding item to cart...")
    page.goto(f"{base_url}/#shop")
    # Wait for products to load
    page.wait_for_selector(".product-card")
    page.locator(".add-to-cart").first.click()

    page.goto(f"{base_url}/#cart")
    page.get_by_role("link", name="Proceed to Checkout").click()

    # 5. Select Payment Method
    print("Selecting Saved Payment Method...")
    # Verify dropdown exists
    expect(page.locator("#saved-card-select")).to_be_visible()

    # Select the card (value will be ID, but we can select by label/text content partly)
    # Since ID is generated, we just select the second option (first is empty/manual)
    page.locator("#saved-card-select").select_option(index=1)

    # Verify fields are auto-filled
    expect(page.locator("#card-number")).to_have_value("4242 4242 4242 4242")
    expect(page.locator("#card-expiry")).to_have_value("12/30")
    expect(page.locator("#card-cvv")).to_have_value("123")

    # 6. Take Screenshot
    cwd = os.getcwd()
    screenshot_path = f"{cwd}/verification/billing_verification.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_billing_flow(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
