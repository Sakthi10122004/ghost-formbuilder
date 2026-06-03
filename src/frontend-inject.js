(function() {
    'use strict';
    console.log('[ghost-formbuilder] Admin UI Injector Booted.');

    function syncTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('ghost-admin-theme', isDark ? 'dark' : 'light');
    }
    syncTheme();

    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    let injected = false;

    function createFormsButton(settingsLink, settingsLi) {
        const li = document.createElement(settingsLi ? settingsLi.tagName : 'li');
        if (settingsLi) {
            li.className = settingsLi.className;
        } else {
            li.className = 'gh-nav-list-h';
        }
        
        const a = document.createElement(settingsLink ? settingsLink.tagName : 'a');
        a.id = 'ghost-formbuilder-nav';
        if (a.tagName === 'A') {
            a.href = '/form-builder/';
        }
        
        if (settingsLink) {
            // Copy all classes from the Settings link, but filter out "active" state classes
            const classes = settingsLink.className.split(' ').filter(c => !c.toLowerCase().includes('active'));
            a.className = classes.join(' ');
        } else {
            a.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                margin: 4px 16px;
                border-radius: 6px;
                cursor: pointer;
                color: #7c8b9a;
                font-size: 13.5px;
                font-weight: 500;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                text-decoration: none;
            `;
        }

        // Query the size of the icon inside Settings to match it perfectly
        let iconSize = '18';
        if (settingsLink) {
            const settingsSvg = settingsLink.querySelector('svg');
            if (settingsSvg) {
                iconSize = settingsSvg.getAttribute('width') || settingsSvg.getAttribute('height') || '18';
            }
        }

        // Build the icon inside our link - using currentColor so that it automatically
        // mirrors the active/hover/normal text color changes from the stylesheet.
        a.innerHTML = `
            <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Forms</span>
        `;

        a.addEventListener('click', (e) => {
            // Let the standard link navigation to /form-builder/ occur in the same tab
            window.location.href = '/form-builder/';
        });

        li.appendChild(a);
        return li;
    }

    function tryInject() {
        if (injected) return true;
        if (document.getElementById('ghost-formbuilder-nav')) {
            injected = true;
            return true;
        }

        let settingsLink = document.querySelector('a[href*="settings"]');
        if (!settingsLink) {
            const allLinks = document.querySelectorAll('a');
            for (const link of allLinks) {
                if (link.textContent && link.textContent.trim().toLowerCase() === 'settings') {
                    settingsLink = link;
                    break;
                }
            }
        }

        if (!settingsLink) return false;

        const settingsLi = settingsLink.closest('li') || settingsLink.parentElement;
        if (!settingsLi || !settingsLi.parentElement) return false;

        const formsBtn = createFormsButton(settingsLink, settingsLi);
        settingsLi.parentElement.insertBefore(formsBtn, settingsLi);

        if (!document.getElementById('fb-inject-styles')) {
            const style = document.createElement('style');
            style.id = 'fb-inject-styles';
            style.textContent = `
                @keyframes fbFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fbSlideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        injected = true;
        console.log('[ghost-formbuilder] ✅ Forms tab injected into sidebar before Settings.');
        return true;
    }

    const observer = new MutationObserver(() => {
        tryInject();
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
        tryInject();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
            tryInject();
        });
    }
})();
