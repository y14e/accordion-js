export class Accordion {
  constructor(root, options) {
    if (!root) {
      return;
    }
    this.rootElement = root;
    this.defaults = {
      animation: {
        duration: 300,
        easing: 'ease',
      },
      selector: {
        content: ':has(> [data-accordion-trigger]) + *',
        trigger: '[data-accordion-trigger]',
      },
    };
    this.settings = {
      animation: { ...this.defaults.animation, ...options?.animation },
      selector: { ...this.defaults.selector, ...options?.selector },
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
      const content = this.contentElements[i];
      const contentId = content.getAttribute('id') || `accordion-content-${id}`;
      content.setAttribute('id', contentId);
      trigger.setAttribute('aria-controls', contentId);
      if (!trigger.hasAttribute('aria-expanded')) {
        trigger.setAttribute('aria-expanded', 'false');
      }
      trigger.setAttribute('id', trigger.getAttribute('id') || `accordion-trigger-${id}`);
      trigger.setAttribute('tabindex', String(this.isFocusable(trigger) ? 0 : -1));
      if (!this.isFocusable(trigger)) {
        trigger.style.setProperty('pointer-events', 'none');
      }
      trigger.addEventListener('click', this.handleTriggerClick);
      trigger.addEventListener('keydown', this.handleTriggerKeyDown);
    });
    this.contentElements.forEach((content, i) => {
      content.setAttribute('aria-labelledby', `${content.getAttribute('aria-labelledby') || ''} ${this.triggerElements[i].getAttribute('id')}`.trim());
      content.setAttribute('role', 'region');
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
    return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
  }

  toggle(trigger, open, match = false) {
    if (open.toString() === trigger.getAttribute('aria-expanded')) {
      return;
    }
    const name = trigger.getAttribute('data-accordion-name');
    if (name) {
      const current = this.rootElement.querySelector(`[aria-expanded="true"][data-accordion-name="${name}"]`);
      if (open && current && current !== trigger) {
        this.close(current);
      }
    }
    trigger.setAttribute('aria-label', trigger.getAttribute(`data-accordion-${open ? 'expanded' : 'collapsed'}-label`) ?? (trigger.getAttribute('aria-label') || ''));
    const index = this.triggerElements.indexOf(trigger);
    const content = this.contentElements[index];
    const computed = window.getComputedStyle(content);
    const size = !content.hasAttribute('hidden') ? computed.getPropertyValue('block-size') : '0';
    let animation = this.animations[index];
    if (animation) {
      animation.cancel();
    }
    content.removeAttribute('hidden');
    window.requestAnimationFrame(() => {
      trigger.setAttribute('aria-expanded', String(open));
    });
    content.style.setProperty('overflow', 'clip');
    animation = this.animations[index] = content.animate(
      {
        blockSize: [size, open ? computed.getPropertyValue('block-size') : '0'],
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
    this.toggle(trigger, trigger.getAttribute('aria-expanded') === 'false');
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
    const trigger = this.rootElement.querySelector(`[aria-controls="${event.currentTarget.getAttribute('id')}"]`);
    if (trigger.getAttribute('aria-expanded') === 'true') {
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
