import { test, expect } from '@playwright/test';

test('QR Code download buttons are present and functional', async ({ page }) => {
  // Mock the partner login by setting localStorage
  await page.addInitScript(() => {
    window.localStorage.setItem('affiliate_partner_id', 'test_partner_123');
  });

  // Mock the API response for partner stats
  await page.route('**/api/partners/test_partner_123/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: 'Test Partner',
        totalClicks: 100,
        activeClients: 5,
        monthlyRevenue: 500,
        referralLink: 'https://websbaca.cz?ref=test_partner_123'
      }),
    });
  });

  await page.goto('http://localhost:3000/partnerprogram');

  // Wait for the dashboard to load
  await expect(page.locator('text=QR Code Generator')).toBeVisible({ timeout: 10000 });

  // Check if PNG download button exists
  const pngButton = page.locator('button:has-text("Download PNG")');
  await expect(pngButton).toBeVisible();

  // Check if PDF download button exists
  const pdfButton = page.locator('button:has-text("Download PDF")');
  await expect(pdfButton).toBeVisible();

  // Verify PNG download starts
  const downloadPromise = page.waitForEvent('download');
  await pngButton.click();
  const download = await downloadPromise;
  
  expect(download.suggestedFilename()).toBe('websbaca-qr-test_partner_123.png');
});
