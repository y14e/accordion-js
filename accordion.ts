type AccordionOptions = {
  selector: {
    section: string;
    header: string;
    trigger: string;
    content: string;
  };
  animation: {
    duration: number;
    easing: string;
  };
};

export class Accordion {
  private rootElement!: HTMLElement;
  private defaults!: AccordionOptions;
  private settings!: AccordionOptions;
  private sectionElements!: HTMLElement[];
  private headerElements!: HTMLElement[];
  private triggerElements!: HTMLElement[];
  private contentElements!: HTMLElement[];
  private animations!: (Animation | null)[];

  constructor(root: HTMLElement, options?: Partial<AccordionOptions>) {
    if (!root) {
      return;
    }
    this.rootElement = root;
    this.defaults = {
      selector: {
        section: ':has(> [data-accordion-header])',
        header: '[data-accordion-header]',
        trigger: '[data-accordion-trigger]',
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
    this.sectionElements = [...this.rootElement.querySelectorAll(`${this.settings.selector.section}${NOT_NESTED}`)] as HTMLElement[];
    this.headerElements = [...this.rootElement.querySelectorAll(`${this.settings.selector.header}${NOT_NESTED}`)] as HTMLElement[];
    this.triggerElements = [...this.rootElement.querySelectorAll(`${this.settings.selector.trigger}${NOT_NESTED}`)] as HTMLElement[];
    this.contentElements = [...this.rootElement.querySelectorAll(`${this.settings.selector.content}${NOT_NESTED}`)] as HTMLElement[];
    this.animations = Array(this.sectionElements.length).fill(null);
    this.handleTriggerClick = this.handleTriggerClick.bind(this);
    this.handleTriggerKeyDown = this.handleTriggerKeyDown.bind(this);
    this.handleContentBeforeMatch = this.handleContentBeforeMatch.bind(this);
    this.initialize();
  }

  private initialize(): void {
    if (!this.sectionElements.length || !this.headerElements.length || !this.triggerElements.length || !this.contentElements.length) {
      return;
    }
    this.triggerElements.forEach((trigger, i) => {
      const id = Math.random().toString(36).slice(-8);
      trigger.setAttribute('aria-controls', (this.contentElements[i].id ||= `accordion-content-${id}`));
      if (!trigger.ariaExpanded) {
        trigger.ariaExpanded = 'false';
      }
      trigger.id ||= `accordion-trigger-${id}`;
      trigger.tabIndex = this.isFocusable(trigger) ? 0 : -1;
      if (!this.isFocusable(trigger)) {
        trigger.style.setProperty('pointer-events', 'none');
      }
      trigger.addEventListener('click', this.handleTriggerClick);
      trigger.addEventListener('keydown', this.handleTriggerKeyDown);
    });
    this.contentElements.forEach((content, i) => {
      content.setAttribute('aria-labelledby', `${content.getAttribute('aria-labelledby') || ''} ${this.triggerElements[i].id}`.trim());
      content.role = 'region';
      content.addEventListener('beforematch', this.handleContentBeforeMatch);
    });
    this.rootElement.setAttribute('data-accordion-initialized', '');
  }

  private isFocusable(element: HTMLElement): boolean {
    return element.ariaDisabled !== 'true' && !element.hasAttribute('disabled');
  }

  private toggle(trigger: HTMLElement, open: boolean, match = false): void {
    if (open.toString() === trigger.ariaExpanded) {
      return;
    }
    const name = trigger.getAttribute('data-accordion-name');
    if (name) {
      const current = document.querySelector(`[aria-expanded="true"][data-accordion-name="${name}"]`) as HTMLElement;
      if (open && current && current !== trigger) {
        this.close(current);
      }
    }
    const section = trigger.closest(this.settings.selector.section) as HTMLElement;
    const size = window.getComputedStyle(section).getPropertyValue('block-size');
    window.requestAnimationFrame(() => {
      trigger.ariaExpanded = String(open);
    });
    section.style.setProperty('overflow', 'clip');
    const index = this.triggerElements.indexOf(trigger);
    let animation = this.animations[index];
    if (animation) {
      animation.cancel();
    }
    const content = document.getElementById(trigger.getAttribute('aria-controls')!)!;
    content.removeAttribute('hidden');
    animation = this.animations[index] = section.animate(
      {
        blockSize: [size, `${parseInt(window.getComputedStyle(trigger.closest(this.settings.selector.header)!).getPropertyValue('block-size')) + (open ? parseInt(window.getComputedStyle(content).getPropertyValue('block-size')) : 0)}px`],
      },
      {
        duration: !match ? this.settings.animation.duration : 0,
        easing: this.settings.animation.easing,
      },
    );
    animation.addEventListener('finish', () => {
      this.animations[index] = null;
      if (!open) {
        content.setAttribute('hidden', 'until-found');
      }
      ['block-size', 'overflow'].forEach(name => section.style.removeProperty(name));
    });
  }

  private handleTriggerClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const trigger = event.currentTarget as HTMLElement;
    this.toggle(trigger, trigger.ariaExpanded === 'false');
  }

  private handleTriggerKeyDown(event: KeyboardEvent): void {
    const { key } = event;
    if (!['Enter', ' ', 'End', 'Home', 'ArrowUp', 'ArrowDown'].includes(key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const focusables = this.triggerElements.filter(this.isFocusable);
    const active = document.activeElement;
    const current = active instanceof HTMLElement ? active : null;
    if (!current) {
      return;
    }
    const currentIndex = focusables.indexOf(current);
    const length = focusables.length;
    let newIndex!: number;
    switch (key) {
      case 'Enter':
      case ' ':
        current.click();
        return;
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
    focusables[newIndex].focus();
  }

  private handleContentBeforeMatch(event: Event): void {
    const trigger = document.querySelector(`[aria-controls="${(event.currentTarget as HTMLElement).id}"]`) as HTMLElement;
    if (trigger.ariaExpanded === 'true') {
      return;
    }
    this.toggle(trigger, true, true);
  }

  open(trigger: HTMLElement): void {
    if (!this.triggerElements.includes(trigger)) {
      return;
    }
    this.toggle(trigger, true);
  }

  close(trigger: HTMLElement): void {
    if (!this.triggerElements.includes(trigger)) {
      return;
    }
    this.toggle(trigger, false);
  }
}
