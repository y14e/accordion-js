export class Accordion {
  constructor(root, options) {
    if (!root) {
      return;
    }
    this.rootElement = root;
    this.defaults = {
      selector: {
        trigger: '[data-accordion-trigger]',
        content: ':has(> [data-accordion-trigger]) + *',
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
    this.triggerElements = [...this.rootElement.querySelectorAll(`${this.settings.selector.trigger}${NOT_NESTED}`)];
    this.contentElements = [...this.rootElement.querySelectorAll(`${this.settings.selector.content}${NOT_NESTED}`)];
    this.animations = Array(this.triggerElements.length).fill(null);
    this.handleTriggerClick = this.handleTriggerClick.bind(this);
    this.handleTriggerKeyDown = this.handleTriggerKeyDown.bind(this);
    this.handleContentBeforeMatch = this.handleContentBeforeMatch.bind(this);
    this.initialize();
  }

  initialize() {
    if (!this.triggerElements.length || !this.contentElements.length) {
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

  getActiveElement() {
    let active = document.activeElement;
    while (active instanceof HTMLElement && active.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    return active instanceof HTMLElement ? active : null;
  }

  isFocusable(element) {
    return element.ariaDisabled !== 'true' && !element.hasAttribute('disabled');
  }

  toggle(trigger, open, match = false) {
    if (open.toString() === trigger.ariaExpanded) {
      return;
    }
    const name = trigger.getAttribute('data-accordion-name');
    if (name) {
      const current = this.rootElement.querySelector(`[aria-expanded="true"][data-accordion-name="${name}"]`);
      if (open && current && current !== trigger) {
        this.close(current);
      }
    }
    window.requestAnimationFrame(() => {
      trigger.ariaExpanded = String(open);
    });
    trigger.ariaLabel = trigger.getAttribute(`data-accordion-${open ? 'expanded' : 'collapsed'}-label`) ?? trigger.ariaLabel;
    const index = this.triggerElements.indexOf(trigger);
    let animation = this.animations[index];
    if (animation) {
      animation.cancel();
    }
    const content = this.rootElement.querySelector(`#${trigger.getAttribute('aria-controls')}`);
    const size = `${parseInt(window.getComputedStyle(content).getPropertyValue('block-size')) || 0}px`;
    content.removeAttribute('hidden');
    content.style.setProperty('overflow', 'clip');
    animation = this.animations[index] = content.animate(
      {
        blockSize: [size, `${open ? parseInt(window.getComputedStyle(content).getPropertyValue('block-size')) : 0}px`],
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
      ['block-size', 'overflow'].forEach(name => content.style.removeProperty(name));
    });
  }

  handleTriggerClick(event) {
    event.preventDefault();
    event.stopPropagation();
    const trigger = event.currentTarget;
    this.toggle(trigger, trigger.ariaExpanded === 'false');
  }

  handleTriggerKeyDown(event) {
    const { key } = event;
    if (!['Enter', ' ', 'End', 'Home', 'ArrowUp', 'ArrowDown'].includes(key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const focusables = this.triggerElements.filter(this.isFocusable);
    const active = this.getActiveElement();
    const current = active instanceof HTMLElement ? active : null;
    if (!current) {
      return;
    }
    const currentIndex = focusables.indexOf(current);
    const length = focusables.length;
    let newIndex;
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

  handleContentBeforeMatch(event) {
    const trigger = this.rootElement.querySelector(`[aria-controls="${event.currentTarget.id}"]`);
    if (trigger.ariaExpanded === 'true') {
      return;
    }
    this.toggle(trigger, true, true);
  }

  open(trigger) {
    if (!this.triggerElements.includes(trigger)) {
      return;
    }
    this.toggle(trigger, true);
  }

  close(trigger) {
    if (!this.triggerElements.includes(trigger)) {
      return;
    }
    this.toggle(trigger, false);
  }
}
