import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type ElementType = 'system' | 'container' | 'component' | 'person' | 'externalSystem';

/**
 * Page object for the Toolbar/Element Palette component
 * Handles: element drag sources, level-aware visibility
 */
export class ToolbarPage extends BasePage {
  readonly sidebar: Locator;
  readonly tabList: Locator;
  readonly diagramsTab: Locator;
  readonly elementsTab: Locator;
  readonly diagramsPanel: Locator;
  readonly elementsPanel: Locator;
  readonly title: Locator;
  readonly levelLabel: Locator;
  readonly quickTips: Locator;
  readonly addDiagramButton: Locator;
  readonly diagramLevelMenu: Locator;

  // Element drag sources
  readonly systemElement: Locator;
  readonly containerElement: Locator;
  readonly componentElement: Locator;
  readonly personElement: Locator;
  readonly externalSystemElement: Locator;

  // No elements message
  readonly noElementsMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Toolbar is the aside with w-64 class
    this.sidebar = page.locator('aside.w-64');
    this.tabList = this.sidebar.getByRole('tablist', { name: 'Toolbar sections' });
    this.diagramsTab = this.tabList.getByRole('tab', { name: 'Diagrams' });
    this.elementsTab = this.tabList.getByRole('tab', { name: 'Elements' });
    this.diagramsPanel = this.sidebar.locator('#toolbar-diagrams-panel');
    this.elementsPanel = this.sidebar.getByRole('tabpanel', { name: 'Elements' });
    this.title = this.sidebar.locator('h2');
    this.levelLabel = this.sidebar.locator('p.text-xs.text-gray-500');
    this.quickTips = this.sidebar.locator('.bg-blue-50');

    // Element buttons - use more specific selectors
    this.systemElement = this.sidebar.locator('div[draggable="true"]:has-text("Software System")');
    this.containerElement = this.sidebar.locator('div[draggable="true"]:has-text("Container")').first();
    this.componentElement = this.sidebar.locator('div[draggable="true"]:has-text("Component")');
    this.personElement = this.sidebar.locator('div[draggable="true"]:has-text("Person")');
    this.externalSystemElement = this.sidebar.locator('div[draggable="true"]:has-text("External System")');

    this.noElementsMessage = this.sidebar.locator('text=No elements can be added');
    this.addDiagramButton = this.sidebar.getByRole('button', { name: 'Add Diagram' });
    this.diagramLevelMenu = this.sidebar.getByRole('menu', { name: 'Choose diagram level' });
  }

  /**
   * Get the element locator by type
   */
  getElement(type: ElementType): Locator {
    const elements: Record<ElementType, Locator> = {
      system: this.systemElement,
      container: this.containerElement,
      component: this.componentElement,
      person: this.personElement,
      externalSystem: this.externalSystemElement,
    };
    return elements[type];
  }

  /**
   * Check if an element type is visible in the toolbar
   */
  async isElementVisible(type: ElementType): Promise<boolean> {
    const element = this.getElement(type);
    return await element.isVisible();
  }

  /**
   * Get all visible element types
   */
  async getVisibleElementTypes(): Promise<ElementType[]> {
    const types: ElementType[] = [];
    if (await this.systemElement.isVisible()) types.push('system');
    if (await this.containerElement.isVisible()) types.push('container');
    if (await this.componentElement.isVisible()) types.push('component');
    if (await this.personElement.isVisible()) types.push('person');
    if (await this.externalSystemElement.isVisible()) types.push('externalSystem');
    return types;
  }

  /**
   * Get the current level display text
   */
  async getCurrentLevelDisplay(): Promise<string> {
    return await this.levelLabel.textContent() || '';
  }

  async activateElementsTab(): Promise<void> {
    await this.elementsTab.focus();
    await this.page.keyboard.press('Enter');
  }

  async activateDiagramsTab(): Promise<void> {
    await this.diagramsTab.focus();
    await this.page.keyboard.press('Enter');
  }
  async createDiagram(level: 'context' | 'container' | 'component' | 'code'): Promise<void> {
    await this.activateDiagramsTab();
    await this.addDiagramButton.click();
    await this.diagramLevelMenu.getByRole('menuitem', {
      name: level.charAt(0).toUpperCase() + level.slice(1),
    }).click();
    await this.activateElementsTab();
  }


  getDiagramSelection(name: string): Locator {
    return this.diagramsPanel.locator('button').filter({ hasText: name }).first();
  }

  /**
   * Drag an element to a specific position on the canvas
   */
  async dragElementToCanvas(
    type: ElementType,
    canvas: Locator,
    position: { x: number; y: number }
  ): Promise<void> {
    const element = this.getElement(type);
    await element.dragTo(canvas, { targetPosition: position });
    // Wait for element to be created
    await this.page.waitForTimeout(200);
  }

  /**
   * Verify toolbar shows correct elements for a given level
   */
  async verifyElementsForLevel(level: 'context' | 'container' | 'component' | 'code'): Promise<void> {
    const expectedElements: Record<string, ElementType[]> = {
      context: ['system', 'person', 'externalSystem'],
      container: ['system', 'container', 'person', 'externalSystem'],
      component: ['container', 'component', 'person'],
      code: ['component'],
    };

    const expected = expectedElements[level];
    const visible = await this.getVisibleElementTypes();

    for (const type of expected) {
      expect(visible).toContain(type);
    }
  }

  /**
   * Check if quick tips section is visible
   */
  async isQuickTipsVisible(): Promise<boolean> {
    return await this.quickTips.isVisible();
  }

  /**
   * Get quick tips content
   */
  async getQuickTipsContent(): Promise<string> {
    return await this.quickTips.textContent() || '';
  }
}
