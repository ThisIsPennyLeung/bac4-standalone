import { test, expect } from '@playwright/test';
import { AppPage } from '../../pages/AppPage';

test.describe('Cross-Diagram Content Reuse', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.clearLocalStorage();
    await app.navigate();

    await page.evaluate(() => {
      const store = window.__ZUSTAND_STORE__.getState();
      store.clearAll();
      const placeholder = store.addElement('system', {
        name: 'Placeholder System',
        position: { x: 100, y: 100 },
      });
      const firstDiagram = store.exportModel().currentDiagram;
      store.addDiagram('Stored content', 'context');
      store.addElement('system', {
        name: 'Reusable System',
        position: { x: 300, y: 100 },
      });
      store.switchDiagram(firstDiagram);
      store.setSelectedElement(placeholder);
    });
  });

  test('searches and atomically reuses a same-type stored element', async ({ page }) => {
    await expect(app.propertiesPanel.reuseElementButton).toBeVisible();
    await app.propertiesPanel.reuseElementButton.click();
    await expect(app.propertiesPanel.reuseSearchInput).toBeFocused();

    await app.propertiesPanel.reuseSearchInput.fill('reusable');
    await expect(page.getByText('Reusable System')).toBeVisible();
    await page.getByText('Reusable System').click();

    await expect(app.propertiesPanel.panel.locator('#name')).toHaveValue('Reusable System');
    await expect(app.propertiesPanel.reuseElementButton).toBeVisible();
  });

  test('closes element reuse without mutation on Escape and shows no-results state', async ({ page }) => {
    await app.propertiesPanel.reuseElementButton.click();
    await app.propertiesPanel.reuseSearchInput.fill('missing');
    await expect(app.propertiesPanel.reuseNoResults).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(app.propertiesPanel.reuseSearchInput).not.toBeVisible();
    await expect(app.propertiesPanel.panel.locator('#name')).toHaveValue('Placeholder System');
  });
});
