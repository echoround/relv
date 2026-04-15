(function () {
    let timeout;

    document.body.classList.remove('scrolling');

    const handleScroll = () => {
        document.body.classList.add('scrolling');
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            document.body.classList.remove('scrolling');
        }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
})();
