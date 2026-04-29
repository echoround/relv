(function () {
  const bindNav = () => {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.site-nav');

    if (!toggle || !nav || toggle.dataset.navBound === 'true') return;

    toggle.dataset.navBound = 'true';

    const closeNav = () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', closeNav);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindNav, { once: true });
  } else {
    bindNav();
  }
})();
