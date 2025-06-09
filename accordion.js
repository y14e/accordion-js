export class Accordion {
  constructor(root, options) {
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
      selector: {
        ...this.defaults.selector,
        ...options?.selector,
      },
      animation: {
        ...this.defaults.animation,
        ...options?.animation,
      },
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.settings.animation.duration = 0;
    }
    const NOT_NESTED = `:not(:scope ${this.settings.selector.content} *)`;
    this.sectionElements = [...this.rootElement.querySelectorAll(`${this.settings.selector.section}${NOT_NESTED}`)];
    this.headerElements = [...this.rootElement.querySelectorAll(`${this.settings.selector.header}${NOT_NESTED}`)];
    this.triggerElements = [...this.rootElement.querySelectorAll(`${this.settings.selector.trigger}${NOT_NESTED}`)];
    this.contentElements = [...this.rootElement.querySelectorAll(`${this.settings.selector.content}${NOT_NESTED}`)];
    if (!this.sectionElements.length || !this.headerElements.length || !this.triggerElements.length || !this.contentElements.length) {
      return;
    }
    this.animations = Array(this.sectionElements.length).fill(null);
    this.triggerElements.forEach((trigger, i) => {
      const id = Math.random().toString(36).slice(-8);
      trigger.setAttribute('aria-controls', (this.contentElements[i].id ||= `accordion-content-${id}`));
      trigger.setAttribute('id', trigger.getAttribute('id') || `accordion-trigger-${id}`);
      trigger.setAttribute('tabindex', this.isFocusable(trigger) ? '0' : '-1');
      if (!this.isFocusable(trigger)) {
        trigger.style.setProperty('pointer-events', 'none');
      }
      trigger.addEventListener('click', this.handleTriggerClick.bind(this));
      trigger.addEventListener('keydown', this.handleTriggerKeyDown.bind(this));
    });
    this.contentElements.forEach((content, i) => {
      content.setAttribute('aria-labelledby', `${content.getAttribute('aria-labelledby') || ''} ${this.triggerElements[i].getAttribute('id')}`.trim());
      content.setAttribute('role', 'region');
      content.addEventListener('beforematch', this.handleContentBeforeMatch.bind(this));
    });
    this.rootElement.setAttribute('data-accordion-initialized', '');
  }

  isFocusable(element) {
    return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
  }

  toggle(trigger, isOpen, isMatch = false) {
    const name = trigger.getAttribute('data-accordion-name');
    if (name) {
      const opened = document.querySelector(`[aria-expanded="true"][data-accordion-name="${name}"]`);
      if (isOpen && opened && opened !== trigger) {
        this.close(opened);
      }
    }
    const section = trigger.closest(this.settings.selector.section);
    const blockSize = window.getComputedStyle(section).getPropertyValue('block-size');
    window.requestAnimationFrame(() => {
      trigger.setAttribute('aria-expanded', String(isOpen));
    });
    section.style.setProperty('overflow', 'clip');
    const index = this.triggerElements.indexOf(trigger);
    let animation = this.animations[index];
    if (animation) {
      animation.cancel();
    }
    const content = document.getElementById(trigger.getAttribute('aria-controls'));
    content.removeAttribute('hidden');
    animation = this.animations[index] = section.animate(
      {
        blockSize: [blockSize, `${parseInt(window.getComputedStyle(trigger.closest(this.settings.selector.header)).getPropertyValue('block-size')) + (isOpen ? parseInt(window.getComputedStyle(content).getPropertyValue('block-size')) : 0)}px`],
      },
      {
        duration: !isMatch ? this.settings.animation.duration : 0,
        easing: this.settings.animation.easing,
      },
    );
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

  handleTriggerClick(event) {
    event.preventDefault();
    const trigger = event.currentTarget;
    this.toggle(trigger, trigger.getAttribute('aria-expanded') !== 'true');
  }

  handleTriggerKeyDown(event) {
    const { key } = event;
    if (!['Enter', ' ', 'End', 'Home', 'ArrowUp', 'ArrowDown'].includes(key)) {
      return;
    }
    event.preventDefault();
    const current = document.activeElement;
    if (['Enter', ' '].includes(key)) {
      current.click();
      return;
    }
    const focusables = this.triggerElements.filter(this.isFocusable);
    const currentIndex = focusables.indexOf(current);
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
    focusables[newIndex].focus();
  }

  handleContentBeforeMatch(event) {
    const trigger = document.querySelector(`[aria-controls="${event.currentTarget.getAttribute('id')}"]`);
    if (trigger.getAttribute('aria-expanded') === 'true') {
      return;
    }
    this.toggle(trigger, true, true);
  }

  open(trigger) {
    if (trigger.getAttribute('aria-expanded') === 'true') {
      return;
    }
    this.toggle(trigger, true);
  }

  close(trigger) {
    if (trigger.getAttribute('aria-expanded') !== 'true') {
      return;
    }
    this.toggle(trigger, false);
  }
}
