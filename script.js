if (window.location.hostname.includes('.webflow.io')) {
    document.querySelectorAll('.staging-only').forEach(el => {
        el.style.setProperty('display', 'contents', 'important');
    });
}
