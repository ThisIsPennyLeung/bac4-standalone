import { test, expect } from '@playwright/test';
import { AppPage } from '../../pages/AppPage';

const levels = ['context', 'container', 'component', 'code'] as const;

test.describe('Diagram level behavior', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    app.setupDialogDismiss();
    await app.clearLocalStorage();
    await app.navigate();
  });

  test('shows a static Context level and no Header selector', async ({ page }) => {
    await expect(page.locator('header select')).toHaveCount(0);
    await expect(app.header.currentLevel).toHaveText('Level: Context');
  });

  for (const level of levels) {
    test(`creates and selects a ${level} diagram`, async ({ page }) => {
      await app.toolbar.createDiagram(level);
      await expect(app.header.currentLevel).toHaveText(`Level: ${level.charAt(0).toUpperCase() + level.slice(1)}`);
      await expect.poll(() => page.evaluate(() => (window as any).__ZUSTAND_STORE__.getState().diagrams.length)).toBe(2);
      await app.toolbar.activateElementsTab();
      await app.toolbar.verifyElementsForLevel(level);
    });
  }

  test('creates a distinct same-level diagram', async ({ page }) => {
    await app.toolbar.createDiagram('context');
    await expect.poll(() => page.evaluate(() => (window as any).__ZUSTAND_STORE__.getState().diagrams.length)).toBe(2);
  });
});
