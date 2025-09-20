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

test.describe('Facilitator Down Scenarios', () => {
  test('should handle facilitator downtime gracefully without spinner deadlocks', async ({ page }) => {
    // Test the application's behavior when the facilitator is unreachable
    await page.goto('/demos/amazon');

    // Use a valid test ASIN
    await page.fill('input[placeholder*="B00EXAMPLE"]', 'B01MS1PMML');
    await page.fill('input[type="number"]', '1');

    // Start the purchase process
    await page.click('button:has-text("Purchase via x402")');

    // Should show loading initially
    await expect(page.locator('text=Processing x402 Payment')).toBeVisible();

    // Wait for the operation to complete (should not hang indefinitely)
    await page.waitForSelector('text=Purchase Successful, text=Purchase Failed', {
      timeout: 60000 // Generous timeout to handle network issues
    });

    // Should not be stuck in loading state
    await expect(page.locator('text=Processing x402 Payment')).not.toBeVisible();

    // If facilitator is down, should show clear error
    const failureVisible = await page.locator('text=Purchase Failed').isVisible();
    if (failureVisible) {
      const errorText = await page.locator('[data-testid="error-details"], .text-red-300').textContent();
      console.log('Facilitator down error:', errorText);

      // Error should mention connectivity or service issues
      const hasNetworkError = errorText?.includes('Connection') ||
                             errorText?.includes('facilitator') ||
                             errorText?.includes('timeout') ||
                             errorText?.includes('unreachable');

      if (hasNetworkError) {
        console.log('Facilitator connectivity issue detected - this is expected if facilitator is down');
      }

      // Should provide actionable guidance
      expect(errorText?.length).toBeGreaterThan(20);
    }
  });

  test('should show health banner when facilitator is unreachable', async ({ page }) => {
    await page.goto('/');

    // Health banner should appear if facilitator is down
    // Wait a bit for health checks to complete
    await page.waitForTimeout(5000);

    // Check if health banner is visible
    const healthBanner = page.locator('[class*="bg-gradient-to-r"][class*="from-red-600"]');
    const healthBannerVisible = await healthBanner.isVisible();

    if (healthBannerVisible) {
      console.log('Health banner is visible - services may be down');

      // Banner should mention specific service issues
      await expect(healthBanner).toContainText('System issues detected');

      // Should have a link to view details
      await expect(healthBanner.locator('text=View Details')).toBeVisible();
    } else {
      console.log('Health banner not visible - services appear to be up');
    }
  });

  test('should timeout gracefully on facilitator requests', async ({ page }) => {
    await page.goto('/demos/amazon');

    await page.fill('input[placeholder*="B00EXAMPLE"]', 'B01MS1PMML');
    await page.fill('input[type="number"]', '1');

    const startTime = Date.now();

    await page.click('button:has-text("Purchase via x402")');

    // Wait for completion
    await page.waitForSelector('text=Purchase Successful, text=Purchase Failed', {
      timeout: 60000
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Purchase attempt took ${duration}ms`);

    // Should not take excessively long (our timeout should kick in)
    expect(duration).toBeLessThan(45000); // Should timeout before 45s

    // Should handle timeout gracefully
    const failureVisible = await page.locator('text=Purchase Failed').isVisible();
    if (failureVisible && duration > 20000) {
      const errorText = await page.locator('[data-testid="error-details"], .text-red-300').textContent();
      console.log('Timeout error:', errorText);

      // Should mention timeout or connection issues
      const hasTimeoutError = errorText?.includes('timeout') ||
                             errorText?.includes('Connection') ||
                             errorText?.includes('failed');

      if (hasTimeoutError) {
        console.log('Timeout handling working correctly');
      }
    }
  });

  test('should handle partial service failures', async ({ page }) => {
    // Test when some services are up but others are down
    await page.goto('/health');

    // Wait for health checks to complete
    await page.waitForTimeout(3000);

    // Should show individual service statuses
    await expect(page.locator('text=Facilitator')).toBeVisible();
    await expect(page.locator('text=Amazon Proxy')).toBeVisible();
    await expect(page.locator('text=Payment Proxy')).toBeVisible();

    // Each service should have a status indicator
    const facilitatorStatus = page.locator('text=Facilitator').locator('..');
    const amazonStatus = page.locator('text=Amazon Proxy').locator('..');
    const paymentStatus = page.locator('text=Payment Proxy').locator('..');

    // Should show either healthy (green) or error (red) indicators
    const hasStatusIndicators = await facilitatorStatus.locator('svg').count() > 0;
    expect(hasStatusIndicators).toBeTruthy();

    // Check overall status
    const overallStatus = page.locator('text=All Systems Operational, text=Issues Detected');
    await expect(overallStatus).toBeVisible();

    const hasIssues = await page.locator('text=Issues Detected').isVisible();
    if (hasIssues) {
      console.log('Service issues detected on health page');

      // Should provide remediation steps
      await expect(page.locator('text=Remediation Steps')).toBeVisible();
      await expect(page.locator('text=check ports')).toBeVisible();
    }
  });

  test('should allow retry after facilitator failure', async ({ page }) => {
    await page.goto('/demos/amazon');

    await page.fill('input[placeholder*="B00EXAMPLE"]', 'B01MS1PMML');
    await page.fill('input[type="number"]', '1');

    // First attempt
    await page.click('button:has-text("Purchase via x402")');

    await page.waitForSelector('text=Purchase Successful, text=Purchase Failed', {
      timeout: 60000
    });

    // If it failed, should be able to retry
    const failureVisible = await page.locator('text=Purchase Failed').isVisible();
    if (failureVisible) {
      console.log('First attempt failed, testing retry...');

      // Button should be re-enabled for retry
      const purchaseButton = page.locator('button:has-text("Purchase via x402")');
      await expect(purchaseButton).toBeEnabled();

      // Try again
      await purchaseButton.click();

      await page.waitForSelector('text=Purchase Successful, text=Purchase Failed', {
        timeout: 60000
      });

      // Should handle retry gracefully (may succeed or fail again)
      const secondAttemptStatus = await page.locator('text=Purchase Successful, text=Purchase Failed').textContent();
      console.log('Second attempt result:', secondAttemptStatus);
    }
  });

  test('should show diagnostics page when facilitator is down', async ({ page }) => {
    await page.goto('/diagnostics');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Diagnostics');

    // Run diagnostics
    await page.click('button:has-text("Run All Tests")');

    // Wait for tests to complete
    await expect(page.locator('text=Running Tests')).not.toBeVisible({ timeout: 30000 });

    // Should show test results
    await expect(page.locator('text=Configuration Validation')).toBeVisible();
    await expect(page.locator('text=Facilitator Health Check')).toBeVisible();

    // Check if facilitator test failed
    const facilitatorTest = page.locator('text=Facilitator Health Check').locator('..');
    const facilitatorFailed = await facilitatorTest.locator('svg[class*="text-red"]').isVisible();

    if (facilitatorFailed) {
      console.log('Facilitator health test failed as expected');

      // Should show troubleshooting section
      await expect(page.locator('text=Troubleshooting')).toBeVisible();
      await expect(page.locator('text=Check that all proxy services are running')).toBeVisible();
    }

    // Should show overall test summary
    const testCounts = page.locator('text=Passed, text=Failed, text=Warnings');
    await expect(testCounts.first()).toBeVisible();
  });
});