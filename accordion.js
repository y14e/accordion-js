class Accordion {
  constructor(root, options) {
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

  initialize() {
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

  isFocusable(element) {
    return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
  }

  toggle(button, isOpen, isMatch = false) {
    let name = button.getAttribute('data-accordion-name');
    if (name) {
      let opened = document.querySelector(`[aria-expanded="true"][data-accordion-name="${name}"]`);
      if (isOpen && opened && opened !== button) this.close(opened, isMatch);
    }
    let section = button.closest(this.settings.selector.section);
    let height = `${section.offsetHeight}px`;
    window.requestAnimationFrame(() => button.setAttribute('aria-expanded', String(isOpen)));
    section.style.setProperty('overflow', 'clip');
    let index = [...this.buttonElements].indexOf(button);
    let animation = this.animations[index];
    if (animation) animation.cancel();
    let panel = document.getElementById(button.getAttribute('aria-controls'));
    panel.removeAttribute('hidden');
    animation = this.animations[index] = section.animate({ height: [height, `${button.closest(this.settings.selector.header).scrollHeight + (isOpen ? panel.scrollHeight : 0)}px`] }, { duration: !isMatch ? this.settings.animation.duration : 0, easing: this.settings.animation.easing });
    animation.addEventListener('finish', () => {
      this.animations[index] = null;
      if (!isOpen) panel.setAttribute('hidden', 'until-found');
      ['height', 'overflow'].forEach(name => section.style.removeProperty(name));
    });
  }

  handleButtonClick(event) {
    event.preventDefault();
    let button = event.currentTarget;
    this.toggle(button, button.getAttribute('aria-expanded') !== 'true');
  }

  handleButtonKeyDown(event) {
    let { key } = event;
    if (!['Enter', ' ', 'ArrowUp', 'ArrowDown', 'End', 'Home'].includes(key)) return;
    event.preventDefault();
    let active = document.activeElement;
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

  handlePanelBeforeMatch(event) {
    let button = document.querySelector(`[aria-controls="${event.currentTarget.getAttribute('id')}"]`);
    if (button.getAttribute('aria-expanded') === 'true') return;
    this.open(button, true);
  }

  open(button, isMatch = false) {
    if (button.getAttribute('aria-expanded') === 'true') return;
    this.toggle(button, true, isMatch);
  }

  close(button, isMatch = false) {
    if (button.getAttribute('aria-expanded') !== 'true') return;
    this.toggle(button, false, isMatch);
  }
}

export default Accordion;
