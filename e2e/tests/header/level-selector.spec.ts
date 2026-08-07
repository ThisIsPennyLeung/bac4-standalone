import { test, expect } from '@playwright/test';
import { AppPage } from '../../pages/AppPage';

test.describe('Level Selector', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    app.setupDialogDismiss();
    await app.clearLocalStorage();
    await app.navigate();
  });

  test('shows all four C4 levels', async () => {
    const levels = await app.header.getAvailableLevels();
    expect(levels).toEqual(['Context', 'Container', 'Component', 'Code']);
  });

  test('default level is context', async () => {
    const level = await app.header.getCurrentLevel();
    expect(level).toBe('context');
  });

  test('changing level without elements works immediately', async () => {
    // Canvas should be empty
    expect(await app.canvas.isEmpty()).toBe(true);

    // Change to container level
    await app.header.selectLevel('container');

    // Should change immediately without confirmation
    const level = await app.header.getCurrentLevel();
    expect(level).toBe('container');
  });

  test('changing level updates toolbar elements - context to container', async () => {
    // Initially at context - should NOT have container
    expect(await app.toolbar.isElementVisible('container')).toBe(false);

    // Change to container level
    await app.header.selectLevel('container');

    // Should now have container element
    expect(await app.toolbar.isElementVisible('container')).toBe(true);
  });

  test('changing level updates toolbar elements - container to component', async () => {
    await app.header.selectLevel('container');

    // Should have system but not component
    expect(await app.toolbar.isElementVisible('system')).toBe(true);
    expect(await app.toolbar.isElementVisible('component')).toBe(false);

    // Change to component level
    await app.header.selectLevel('component');

    // Should have component but not system
    expect(await app.toolbar.isElementVisible('component')).toBe(true);
    expect(await app.toolbar.isElementVisible('system')).toBe(false);
  });

  test('code level shows only component', async () => {
    await app.header.selectLevel('code');

    const visibleTypes = await app.toolbar.getVisibleElementTypes();
    expect(visibleTypes).toEqual(['component']);
  });

  test('changing level creates an empty diagram without clearing the previous one', async () => {
    await app.createSystemElement({ x: 300, y: 200 });
    expect(await app.canvas.getNodeCount()).toBe(1);

    await app.header.selectLevel('container');

    expect(await app.header.getCurrentLevel()).toBe('container');
    expect(await app.canvas.getNodeCount()).toBe(0);

    const { content } = await app.header.exportJson();
    expect(content).toContain('"diagrams"');
    expect(content).toContain('"currentDiagram"');
    expect(content).toContain('"systems"');
  });

  test('choosing the current level is a no-op', async () => {
    await app.header.selectLevel('context');

    expect(await app.header.getCurrentLevel()).toBe('context');
    expect(await app.canvas.isEmpty()).toBe(true);
  });

  test('level change updates toolbar label', async () => {
    // Check initial label
    let label = await app.toolbar.getCurrentLevelDisplay();
    expect(label).toContain('Context');

    // Change to container
    await app.header.selectLevel('container');
    label = await app.toolbar.getCurrentLevelDisplay();
    expect(label).toContain('Container');

    // Change to component
    await app.header.selectLevel('component');
    label = await app.toolbar.getCurrentLevelDisplay();
    expect(label).toContain('Component');

    // Change to code
    await app.header.selectLevel('code');
    label = await app.toolbar.getCurrentLevelDisplay();
    expect(label).toContain('Code');
  });

  test('elements correct for each level', async () => {
    // Context level
    await app.toolbar.verifyElementsForLevel('context');

    // Container level
    await app.header.selectLevel('container');
    await app.toolbar.verifyElementsForLevel('container');

    // Component level
    await app.header.selectLevel('component');
    await app.toolbar.verifyElementsForLevel('component');

    // Code level
    await app.header.selectLevel('code');
    await app.toolbar.verifyElementsForLevel('code');
  });
});
