type AccordionOptions = {
  selector: {
    section: string;
    header: string;
    button: string;
    panel: string;
  };
  animation: {
    duration: number;
    easing: string;
  };
};

class Accordion {
  rootElement: HTMLElement;
  defaults: AccordionOptions;
  settings: AccordionOptions;
  sectionElements: NodeListOf<HTMLElement>;
  headerElements: NodeListOf<HTMLElement>;
  buttonElements: NodeListOf<HTMLElement>;
  panelElements: NodeListOf<HTMLElement>;
  animations: (Animation | null)[] = [];

  constructor(root: HTMLElement, options?: Partial<AccordionOptions>) {
    this.rootElement = root;
    this.defaults = {
      selector: {
        section: ':has(> [data-accordion-header])',
        header: '[data-accordion-header]',
        button: '[data-accordion-button]',
        panel: '[data-accordion-header] + *',
      },
      animation: {
        duration: 300,
        easing: 'ease',
      },
    };
    this.settings = {
      selector: { ...this.defaults.selector, ...options?.selector },
      animation: { ...this.defaults.animation, ...options?.animation },
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.settings.animation.duration = 0;
    let NOT_NESTED = `:not(:scope ${this.settings.selector.panel} *)`;
    this.sectionElements = this.rootElement.querySelectorAll(`${this.settings.selector.section}${NOT_NESTED}`);
    this.headerElements = this.rootElement.querySelectorAll(`${this.settings.selector.header}${NOT_NESTED}`);
    this.buttonElements = this.rootElement.querySelectorAll(`${this.settings.selector.button}${NOT_NESTED}`);
    this.panelElements = this.rootElement.querySelectorAll(`${this.settings.selector.panel}${NOT_NESTED}`);
    if (!this.sectionElements.length || !this.headerElements.length || !this.buttonElements.length || !this.panelElements.length) return;
    this.animations = Array(this.sectionElements.length).fill(null);
    this.initialize();
  }

  private initialize(): void {
    this.buttonElements.forEach((button, i) => {
      let id = Math.random().toString(36).slice(-8);
      button.setAttribute('aria-controls', (this.panelElements[i].id ||= `accordion-panel-${id}`));
      button.setAttribute('id', button.getAttribute('id') || `accordion-button-${id}`);
      button.setAttribute('tabindex', this.isFocusable(button) ? '0' : '-1');
      if (!this.isFocusable(button)) button.style.setProperty('pointer-events', 'none');
      button.addEventListener('click', event => this.handleButtonClick(event));
      button.addEventListener('keydown', event => this.handleButtonKeyDown(event));
    });
    this.panelElements.forEach((panel, i) => {
      panel.setAttribute('aria-labelledby', `${panel.getAttribute('aria-labelledby') || ''} ${this.buttonElements[i].getAttribute('id')}`.trim());
      panel.setAttribute('role', 'region');
      panel.addEventListener('beforematch', event => this.handlePanelBeforeMatch(event));
    });
    this.rootElement.setAttribute('data-accordion-initialized', '');
  }

  private isFocusable(element: HTMLElement): boolean {
    return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
  }

  private toggle(button: HTMLElement, isOpen: boolean, isMatch = false): void {
    let name = button.getAttribute('data-accordion-name');
    if (name) {
      let opened = document.querySelector(`[aria-expanded="true"][data-accordion-name="${name}"]`) as HTMLElement;
      if (isOpen && opened && opened !== button) this.close(opened, isMatch);
    }
    let section = button.closest(this.settings.selector.section) as HTMLElement;
    let height = `${section.offsetHeight}px`;
    window.requestAnimationFrame(() => button.setAttribute('aria-expanded', String(isOpen)));
    section.style.setProperty('overflow', 'clip');
    let index = [...this.buttonElements].indexOf(button);
    let animation = this.animations[index];
    if (animation) animation.cancel();
    let panel = document.getElementById(button.getAttribute('aria-controls')!)!;
    panel.removeAttribute('hidden');
    animation = this.animations[index] = section.animate({ height: [height, `${button.closest(this.settings.selector.header)!.scrollHeight + (isOpen ? panel.scrollHeight : 0)}px`] }, { duration: !isMatch ? this.settings.animation.duration : 0, easing: this.settings.animation.easing });
    animation.addEventListener('finish', () => {
      this.animations[index] = null;
      if (!isOpen) panel.setAttribute('hidden', 'until-found');
      ['height', 'overflow'].forEach(name => section.style.removeProperty(name));
    });
  }

  private handleButtonClick(event: MouseEvent): void {
    event.preventDefault();
    let button = event.currentTarget as HTMLElement;
    this.toggle(button, button.getAttribute('aria-expanded') !== 'true');
  }

  private handleButtonKeyDown(event: KeyboardEvent): void {
    let { key } = event;
    if (!['Enter', ' ', 'ArrowUp', 'ArrowDown', 'End', 'Home'].includes(key)) return;
    event.preventDefault();
    let active = document.activeElement as HTMLElement;
    if (['Enter', ' '].includes(key)) {
      active.click();
      return;
    }
    let focusables = [...this.buttonElements].filter(this.isFocusable);
    let currentIndex = focusables.indexOf(active);
    let length = focusables.length;
    let newIndex = 0;
    switch (key) {
      case 'ArrowUp':
        newIndex = (currentIndex - 1 + length) % length;
        break;
      case 'ArrowDown':
        newIndex = (currentIndex + 1) % length;
        break;
      case 'End':
        newIndex = length - 1;
        break;
    }
    focusables[newIndex].focus();
  }

  private handlePanelBeforeMatch(event: Event): void {
    let button = document.querySelector(`[aria-controls="${(event.currentTarget as HTMLElement).getAttribute('id')}"]`) as HTMLElement;
    if (button.getAttribute('aria-expanded') === 'true') return;
    this.open(button, true);
  }

  open(button: HTMLElement, isMatch = false): void {
    if (button.getAttribute('aria-expanded') === 'true') return;
    this.toggle(button, true, isMatch);
  }

  close(button: HTMLElement, isMatch = false): void {
    if (button.getAttribute('aria-expanded') !== 'true') return;
    this.toggle(button, false, isMatch);
  }
}

export default Accordion;
