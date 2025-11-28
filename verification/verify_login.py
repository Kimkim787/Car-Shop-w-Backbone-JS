from playwright.sync_api import sync_playwright

def verify_login_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (assuming it's running on port 3000)
        page.goto("http://localhost:3000")

        # Wait for the app to load
        page.wait_for_selector(".auth-container")

        # Verify Email label is present (replacing Username)
        email_label = page.query_selector("label:has-text('Email')")
        if email_label:
            print("Found Email label.")
        else:
            print("Email label NOT found.")

        # Take a screenshot
        page.screenshot(path="verification/login_page.png")
        print("Screenshot saved to verification/login_page.png")

        browser.close()

if __name__ == "__main__":
    verify_login_page()
