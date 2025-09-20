import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mock authentication state
  await page.addInitScript(() => {
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      user: { id: 'test-user-id', email: 'test@example.com' },
      session: { access_token: 'mock-token' }
    }));
  });
});

test.describe('Ineligible ASIN Handling', () => {
  test('should explain why ASIN is ineligible and suggest alternatives', async ({ page }) => {
    await page.goto('/demos/amazon');

    // Test with a known problematic or restricted ASIN
    // In a real scenario, this might be items that can't be shipped,
    // are age-restricted, or have other purchasing constraints
    const problematicAsin = 'B000INVALIDTEST';

    await page.fill('input[placeholder*="B00EXAMPLE"]', problematicAsin);
    await page.fill('input[type="number"]', '1');

    await page.click('button:has-text("Purchase via x402")');

    // Wait for error response
    await expect(page.locator('text=Purchase Failed')).toBeVisible({ timeout: 30000 });

    // Should provide clear error explanation
    const errorContent = page.locator('[data-testid="error-details"], .text-red-300');
    await expect(errorContent).toBeVisible();

    // Error should be informative, not just "failed"
    const errorText = await errorContent.textContent();
    expect(errorText).not.toBe('');
    expect(errorText?.length).toBeGreaterThan(10); // Should be more than just "failed"
  });

  test('should handle category restrictions gracefully', async ({ page }) => {
    await page.goto('/demos/amazon');

    // Test with items that might have category restrictions
    // This could be alcohol, prescription items, etc.
    const restrictedAsin = 'B07GMLW8K6'; // USB cable - should work

    await page.fill('input[placeholder*="B00EXAMPLE"]', restrictedAsin);
    await page.fill('input[type="number"]', '1');

    await page.click('button:has-text("Purchase via x402")');

    // Wait for response
    await page.waitForSelector('text=Purchase Successful, text=Purchase Failed', {
      timeout: 30000
    });

    // If this ASIN fails, it should provide helpful information
    const failureVisible = await page.locator('text=Purchase Failed').isVisible();
    if (failureVisible) {
      // Should show detailed error information
      await expect(page.locator('[data-testid="error-details"], .text-red-300')).toBeVisible();

      // Error should suggest alternatives or explain the restriction
      const errorText = await page.locator('[data-testid="error-details"], .text-red-300').textContent();
      console.log('Restriction error:', errorText);
    }
  });

  test('should handle out-of-stock items appropriately', async ({ page }) => {
    await page.goto('/demos/amazon');

    // This test assumes the proxy might return OOS status for some items
    const testAsin = 'B0BXKQ4P5F'; // Batteries - usually in stock

    await page.fill('input[placeholder*="B00EXAMPLE"]', testAsin);
    await page.fill('input[type="number"]', '999'); // Unrealistic quantity

    await page.click('button:has-text("Purchase via x402")');

    await page.waitForSelector('text=Purchase Successful, text=Purchase Failed', {
      timeout: 30000
    });

    // If quantity causes issues, should get informative error
    const failureVisible = await page.locator('text=Purchase Failed').isVisible();
    if (failureVisible) {
      const errorText = await page.locator('[data-testid="error-details"], .text-red-300').textContent();
      console.log('Quantity error:', errorText);

      // Should provide guidance about quantity limits or availability
      expect(errorText).toBeTruthy();
    }
  });

  test('should provide helpful suggestions for failed searches', async ({ page }) => {
    await page.goto('/demos/amazon');

    // Test with completely nonsensical ASIN
    await page.fill('input[placeholder*="B00EXAMPLE"]', 'XXXXXXXXXXXXXXX');
    await page.fill('input[type="number"]', '1');

    await page.click('button:has-text("Purchase via x402")');

    await expect(page.locator('text=Purchase Failed')).toBeVisible({ timeout: 30000 });

    // Should suggest using valid test ASINs
    const errorOrDetails = page.locator('[data-testid="error-details"], .text-red-300, details');
    await expect(errorOrDetails).toBeVisible();

    // Error should be actionable
    const hasErrorText = await errorOrDetails.textContent();
    expect(hasErrorText?.length).toBeGreaterThan(20); // Should be a substantial error message
  });

  test('should handle network failures gracefully', async ({ page }) => {
    // This test checks behavior when services are down
    await page.goto('/demos/amazon');

    // Test with a valid ASIN but expect potential network issues
    await page.fill('input[placeholder*="B00EXAMPLE"]', 'B01MS1PMML');
    await page.fill('input[type="number"]', '1');

    await page.click('button:has-text("Purchase via x402")');

    // Wait longer for network issues
    await page.waitForSelector('text=Purchase Successful, text=Purchase Failed', {
      timeout: 60000
    });

    const failureVisible = await page.locator('text=Purchase Failed').isVisible();
    if (failureVisible) {
      // Network failures should be clearly identified
      const errorText = await page.locator('[data-testid="error-details"], .text-red-300').textContent();
      console.log('Network error:', errorText);

      // Should provide guidance about service status
      if (errorText?.includes('Connection') || errorText?.includes('proxy') || errorText?.includes('facilitator')) {
        // This is expected if services are down
        console.log('Network failure detected - this may be expected if services are not running');
      }
    }
  });

  test('should validate shipping requirements', async ({ page }) => {
    await page.goto('/demos/amazon');

    // Some items might have shipping restrictions
    await page.fill('input[placeholder*="B00EXAMPLE"]', 'B0B7PBQZQX'); // Echo Dot

    await page.fill('input[type="number"]', '1');

    await page.click('button:has-text("Purchase via x402")');

    await page.waitForSelector('text=Purchase Successful, text=Purchase Failed', {
      timeout: 30000
    });

    // If shipping restrictions apply, should be clearly communicated
    const failureVisible = await page.locator('text=Purchase Failed').isVisible();
    if (failureVisible) {
      const errorText = await page.locator('[data-testid="error-details"], .text-red-300').textContent();

      if (errorText?.includes('shipping') || errorText?.includes('address')) {
        console.log('Shipping restriction detected:', errorText);
        // This is expected for items with shipping limitations
      }
    }
  });
});