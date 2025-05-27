type AccordionOptions = {
  selector: {
    section: string;
    header: string;
    button: string;
    content: string;
  };
  animation: {
    duration: number;
    easing: string;
  };
};

export class Accordion {
  private rootElement: HTMLElement;
  private defaults: AccordionOptions;
  private settings: AccordionOptions;
  private sectionElements: NodeListOf<HTMLElement>;
  private headerElements: NodeListOf<HTMLElement>;
  private buttonElements: NodeListOf<HTMLElement>;
  private contentElements: NodeListOf<HTMLElement>;
  private animations: (Animation | null)[] = [];

  constructor(root: HTMLElement, options?: Partial<AccordionOptions>) {
    this.rootElement = root;
    this.defaults = {
      selector: {
        section: ':has(> [data-accordion-header])',
        header: '[data-accordion-header]',
        button: '[data-accordion-button]',
        content: '[data-accordion-header] + *',
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.settings.animation.duration = 0;
    }
    const NOT_NESTED = `:not(:scope ${this.settings.selector.content} *)`;
    this.sectionElements = this.rootElement.querySelectorAll(`${this.settings.selector.section}${NOT_NESTED}`);
    this.headerElements = this.rootElement.querySelectorAll(`${this.settings.selector.header}${NOT_NESTED}`);
    this.buttonElements = this.rootElement.querySelectorAll(`${this.settings.selector.button}${NOT_NESTED}`);
    this.contentElements = this.rootElement.querySelectorAll(`${this.settings.selector.content}${NOT_NESTED}`);
    if (!this.sectionElements.length || !this.headerElements.length || !this.buttonElements.length || !this.contentElements.length) {
      return;
    }
    this.animations = Array(this.sectionElements.length).fill(null);
    this.handleButtonClick = this.handleButtonClick.bind(this);
    this.handleButtonKeyDown = this.handleButtonKeyDown.bind(this);
    this.handleContentBeforeMatch = this.handleContentBeforeMatch.bind(this);
    this.initialize();
  }

  private initialize(): void {
    this.buttonElements.forEach((button, i) => {
      const id = Math.random().toString(36).slice(-8);
      button.setAttribute('aria-controls', (this.contentElements[i]!.id ||= `accordion-content-${id}`));
      button.setAttribute('id', button.getAttribute('id') || `accordion-button-${id}`);
      button.setAttribute('tabindex', this.isFocusable(button) ? '0' : '-1');
      if (!this.isFocusable(button)) {
        button.style.setProperty('pointer-events', 'none');
      }
      button.addEventListener('click', this.handleButtonClick);
      button.addEventListener('keydown', this.handleButtonKeyDown);
    });
    this.contentElements.forEach((content, i) => {
      content.setAttribute('aria-labelledby', `${content.getAttribute('aria-labelledby') || ''} ${this.buttonElements[i]!.getAttribute('id')}`.trim());
      content.setAttribute('role', 'region');
      content.addEventListener('beforematch', this.handleContentBeforeMatch);
    });
    this.rootElement.setAttribute('data-accordion-initialized', '');
  }

  private isFocusable(element: HTMLElement): boolean {
    return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
  }

  private toggle(button: HTMLElement, isOpen: boolean, isMatch = false): void {
    const name = button.getAttribute('data-accordion-name');
    if (name) {
      const opened = document.querySelector(`[aria-expanded="true"][data-accordion-name="${name}"]`) as HTMLElement;
      if (isOpen && opened && opened !== button) {
        this.close(opened);
      }
    }
    const section = button.closest(this.settings.selector.section) as HTMLElement;
    const blockSize = window.getComputedStyle(section).getPropertyValue('block-size');
    window.requestAnimationFrame(() => {
      button.setAttribute('aria-expanded', String(isOpen));
    });
    section.style.setProperty('overflow', 'clip');
    const index = [...this.buttonElements].indexOf(button);
    let animation = this.animations[index];
    if (animation) {
      animation.cancel();
    }
    const content = document.getElementById(button.getAttribute('aria-controls')!)!;
    content.removeAttribute('hidden');
    animation = this.animations[index] = section.animate({ blockSize: [blockSize, `${parseInt(window.getComputedStyle(button.closest(this.settings.selector.header)!).getPropertyValue('block-size')) + (isOpen ? parseInt(window.getComputedStyle(content).getPropertyValue('block-size')) : 0)}px`] }, { duration: !isMatch ? this.settings.animation.duration : 0, easing: this.settings.animation.easing });
    animation.addEventListener('finish', () => {
      this.animations[index] = null;
      if (!isOpen) {
        content.setAttribute('hidden', 'until-found');
      }
      ['block-size', 'overflow'].forEach(name => {
        section.style.removeProperty(name);
      });
    });
  }

  private handleButtonClick(event: MouseEvent): void {
    event.preventDefault();
    const button = event.currentTarget as HTMLElement;
    this.toggle(button, button.getAttribute('aria-expanded') !== 'true');
  }

  private handleButtonKeyDown(event: KeyboardEvent): void {
    const { key } = event;
    if (!['Enter', ' ', 'End', 'Home', 'ArrowUp', 'ArrowDown'].includes(key)) {
      return;
    }
    event.preventDefault();
    const active = document.activeElement as HTMLElement;
    if (['Enter', ' '].includes(key)) {
      active.click();
      return;
    }
    const focusables = [...this.buttonElements].filter(this.isFocusable);
    const currentIndex = focusables.indexOf(active);
    const length = focusables.length;
    let newIndex;
    switch (key) {
      case 'End':
        newIndex = length - 1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'ArrowUp':
        newIndex = (currentIndex - 1 + length) % length;
        break;
      case 'ArrowDown':
        newIndex = (currentIndex + 1) % length;
        break;
    }
    focusables[newIndex]!.focus();
  }

  private handleContentBeforeMatch(event: Event): void {
    const button = document.querySelector(`[aria-controls="${(event.currentTarget as HTMLElement).getAttribute('id')}"]`) as HTMLElement;
    if (button.getAttribute('aria-expanded') === 'true') {
      return;
    }
    this.open(button, true);
  }

  open(button: HTMLElement, isMatch = false): void {
    if (button.getAttribute('aria-expanded') === 'true') {
      return;
    }
    this.toggle(button, true, isMatch);
  }

  close(button: HTMLElement): void {
    if (button.getAttribute('aria-expanded') !== 'true') {
      return;
    }
    this.toggle(button, false);
  }
}
