(function () {
    let timeout;
    
    // Remove .scrolling class on page load to ensure scrollbar is hidden
    document.body.classList.remove('scrolling');
    console.log('scroll.js loaded, .scrolling class removed on init');
    
    // Scroll handler
    const handleScroll = () => {
        document.body.classList.add('scrolling');
        console.log('Scrolling detected, .scrolling class added');
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            document.body.classList.remove('scrolling');
            console.log('Scroll stopped, .scrolling class removed');
        }, 1000); // Hide scrollbar after 1 second of no scrolling
    };
    
    // Add scroll event listeners to both document and window
    document.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
})();