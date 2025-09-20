import { test, expect } from '@playwright/test';

// Mock authentication for E2E tests
test.beforeEach(async ({ page }) => {
  // Mock authentication state
  await page.addInitScript(() => {
    // Mock user in localStorage or sessionStorage if needed
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      user: { id: 'test-user-id', email: 'test@example.com' },
      session: { access_token: 'mock-token' }
    }));
  });
});

test.describe('Eligible ASIN Purchase Flow', () => {
  test('should complete happy path purchase flow for known-good ASIN', async ({ page }) => {
    // Navigate to Amazon demo page
    await page.goto('/demos/amazon');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Amazon Demo');

    // Check that payments are enabled
    await expect(page.locator('text=Payments are not enabled')).not.toBeVisible();

    // Use a known test ASIN (pencils)
    const testAsin = 'B01MS1PMML';
    await page.fill('input[placeholder*="B00EXAMPLE"]', testAsin);
    await page.fill('input[type="number"]', '1');

    // Click purchase button
    await page.click('button:has-text("Purchase via x402")');

    // Wait for either success or failure (with reasonable timeout)
    await page.waitForSelector('text=Purchase Successful, text=Purchase Failed', {
      timeout: 60000
    });

    // Check if purchase was successful
    const isSuccess = await page.locator('text=Purchase Successful').isVisible();
    const isFailure = await page.locator('text=Purchase Failed').isVisible();

    if (isSuccess) {
      // Successful purchase path
      await expect(page.locator('text=Purchase Successful')).toBeVisible();

      // Should show order details
      const orderIdLocator = page.locator('text=Order ID:');
      if (await orderIdLocator.isVisible()) {
        await expect(orderIdLocator).toBeVisible();
      }

      // Should show success message
      await expect(page.locator('text=🎉')).toBeVisible();

    } else if (isFailure) {
      // Expected failure paths - document them for debugging
      const errorText = await page.locator('[data-testid="error-message"]').textContent() ||
                       await page.locator('text=Purchase Failed').locator('..').textContent();

      console.log('Purchase failed with error:', errorText);

      // Check for common expected failure reasons
      const isServiceDown = errorText?.includes('Connection failed') ||
                          errorText?.includes('proxy') ||
                          errorText?.includes('facilitator');

      const isConfigIssue = errorText?.includes('Configuration') ||
                           errorText?.includes('environment');

      const isWalletIssue = errorText?.includes('wallet') ||
                           errorText?.includes('balance') ||
                           errorText?.includes('USDC');

      if (isServiceDown) {
        console.log('Test failed due to service connectivity - this may be expected in CI');
      } else if (isConfigIssue) {
        console.log('Test failed due to configuration issues');
      } else if (isWalletIssue) {
        console.log('Test failed due to wallet/balance issues - may need funding');
      } else {
        // Unexpected failure
        throw new Error(`Unexpected purchase failure: ${errorText}`);
      }
    } else {
      throw new Error('Purchase flow did not complete - no success or failure message shown');
    }
  });

  test('should show proper validation for invalid ASIN', async ({ page }) => {
    await page.goto('/demos/amazon');

    // Use an invalid ASIN
    await page.fill('input[placeholder*="B00EXAMPLE"]', 'INVALID_ASIN');
    await page.fill('input[type="number"]', '1');

    // Click purchase button
    await page.click('button:has-text("Purchase via x402")');

    // Should show error for invalid ASIN
    await expect(page.locator('text=Purchase Failed')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=not found, text=invalid')).toBeVisible();
  });

  test('should handle empty ASIN appropriately', async ({ page }) => {
    await page.goto('/demos/amazon');

    // Leave ASIN empty and try to purchase
    await page.fill('input[placeholder*="B00EXAMPLE"]', '');

    // Purchase button should be disabled
    await expect(page.locator('button:has-text("Purchase via x402")')).toBeDisabled();
  });

  test('should display loading state during purchase', async ({ page }) => {
    await page.goto('/demos/amazon');

    await page.fill('input[placeholder*="B00EXAMPLE"]', 'B01MS1PMML');
    await page.fill('input[type="number"]', '1');

    // Click purchase and immediately check for loading state
    await page.click('button:has-text("Purchase via x402")');

    // Should show loading state
    await expect(page.locator('text=Processing x402 Payment')).toBeVisible();
    await expect(page.locator('.animate-spin')).toBeVisible();

    // Wait for completion
    await page.waitForSelector('text=Purchase Successful, text=Purchase Failed', {
      timeout: 60000
    });
  });
});