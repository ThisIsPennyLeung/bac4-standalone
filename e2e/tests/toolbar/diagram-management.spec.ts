import { test, expect } from '@playwright/test';
import { AppPage } from '../../pages/AppPage';

test.describe('Diagram Management Toolbar', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.clearLocalStorage();
    await app.navigate();
  });

  test('keeps Elements selected by default while Diagrams precedes it', async ({ page }) => {
    await expect(app.toolbar.tabList.getByRole('tab')).toHaveText(['Diagrams', 'Elements']);
    await expect(app.toolbar.elementsTab).toHaveAttribute('aria-selected', 'true');
    await expect(app.toolbar.diagramsTab).toHaveAttribute('aria-selected', 'false');

    await app.toolbar.elementsTab.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(app.toolbar.diagramsTab).toBeFocused();
    await page.keyboard.press('Space');

    await expect(app.toolbar.diagramsTab).toHaveAttribute('aria-selected', 'true');
    await expect(app.toolbar.diagramsPanel).toBeVisible();
  });

  test('creates and auto-selects duplicate named diagrams from a level option', async () => {
    await app.toolbar.createDiagram('context');
    await app.toolbar.activateDiagramsTab();
    await expect(app.toolbar.diagramsPanel.locator('button[aria-current="page"]')).toHaveCount(1);
    await expect(app.toolbar.diagramsPanel.locator('button').filter({ hasText: 'New C4 Model' })).toHaveCount(2);

    await app.toolbar.createDiagram('context');
    await app.toolbar.activateDiagramsTab();
    await expect(app.toolbar.diagramsPanel.locator('button').filter({ hasText: 'New C4 Model' })).toHaveCount(3);
    await expect(app.toolbar.diagramsPanel.locator('button[aria-current="page"]')).toHaveCount(1);
  });

  test('switches diagrams by stable ID and restores their content', async () => {
    await app.toolbar.activateElementsTab();
    await app.createSystemElement({ x: 300, y: 200 });
    await app.toolbar.activateDiagramsTab();
    const initialDiagram = app.toolbar.getDiagramSelection('New C4 Model');

    await app.toolbar.createDiagram('context');
    await app.toolbar.activateDiagramsTab();
    await app.wait(200);
    expect(await app.canvas.getNodeCount()).toBe(0);

    await initialDiagram.click();
    await app.wait(200);
    expect(await app.canvas.getNodeCount()).toBe(1);
  });

  test('cancels and confirms deletion without nesting row controls', async ({ page }) => {
    await app.toolbar.createDiagram('context');
    await app.toolbar.activateDiagramsTab();
    const deleteButton = app.toolbar.diagramsPanel.getByRole('button', { name: 'Delete New C4 Model' }).last();

    page.once('dialog', (dialog) => dialog.dismiss());
    await deleteButton.click();
    await expect(app.toolbar.diagramsPanel.locator('button').filter({ hasText: 'New C4 Model' })).toHaveCount(2);

    page.once('dialog', (dialog) => dialog.accept());
    await deleteButton.click();
    await expect(app.toolbar.diagramsPanel.locator('button').filter({ hasText: 'New C4 Model' })).toHaveCount(1);
    await expect(app.toolbar.diagramsPanel.locator('button[aria-current="page"]')).toHaveCount(1);
  });
});
