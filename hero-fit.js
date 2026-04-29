(function () {
  function fitHeroTitleLine() {
    const el = document.querySelector('[data-autofit]');
    if (!el) return;

    el.style.fontSize = '';
    el.style.letterSpacing = '';

    const computed = getComputedStyle(el);
    const maxSize = parseFloat(computed.fontSize);
    const minSize = 26;
    const baseTracking = 0.06;

    el.style.letterSpacing = `${baseTracking}em`;

    const parent = el.parentElement;
    if (!parent) return;

    const available = parent.clientWidth - 2;
    const needed = el.scrollWidth;

    if (needed <= available) return;

    const ratio = available / needed;
    const target = Math.max(minSize, Math.min(maxSize, maxSize * ratio));

    el.style.fontSize = `${target.toFixed(2)}px`;
  }

  const runFit = () => {
    fitHeroTitleLine();
    requestAnimationFrame(fitHeroTitleLine);
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(runFit).catch(runFit);
  } else {
    window.addEventListener('load', runFit, { once: true });
  }

  window.addEventListener('resize', runFit);
  window.addEventListener('orientationchange', runFit);
})();
