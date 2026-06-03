(function() {
    'use strict';
    console.log('[ghost-formbuilder] Admin UI Injector Booted.');

    function syncTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('ghost-admin-theme', isDark ? 'dark' : 'light');
        const fbContainer = document.getElementById('ghost-formbuilder-container');
        if (fbContainer) {
            fbContainer.style.background = isDark ? '#101114' : '#f4f5f6';
        }
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
            a.href = '#/form-builder';
        }
        
        if (settingsLink) {
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

        let iconSize = '18';
        if (settingsLink) {
            const settingsSvg = settingsLink.querySelector('svg');
            if (settingsSvg) {
                iconSize = settingsSvg.getAttribute('width') || settingsSvg.getAttribute('height') || '18';
            }
        }

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
            e.preventDefault();
            window.location.hash = '#/form-builder';
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

        injected = true;
        console.log('[ghost-formbuilder] ✅ Forms tab injected into sidebar before Settings.');
        return true;
    }

    // ── Hash Routing View Controller ───────────────────────────────
    let fbContainer = null;

    function handleHashChange() {
        const hash = window.location.hash;
        if (hash === '#/form-builder' || hash.startsWith('#/form-builder/')) {
            showFormConsole(hash);
        } else {
            hideFormConsole();
        }
    }

    function showFormConsole(hash) {
        const emberApp = document.getElementById('ember-app');
        const reactApp = document.getElementById('root');
        
        // Hide default apps
        if (emberApp) emberApp.style.setProperty('display', 'none', 'important');
        if (reactApp) reactApp.style.setProperty('display', 'none', 'important');

        const isDark = document.documentElement.classList.contains('dark');

        if (!fbContainer) {
            fbContainer = document.createElement('div');
            fbContainer.id = 'ghost-formbuilder-container';
            fbContainer.style.cssText = `
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 100vw; 
                height: 100vh; 
                z-index: 999999; 
                background: ${isDark ? '#101114' : '#f4f5f6'};
            `;
            document.body.appendChild(fbContainer);
        }
        fbContainer.style.display = 'block';

        let iframeUrl = '/ghost/form-builder/';
        if (hash.startsWith('#/form-builder/builder')) {
            const queryIndex = hash.indexOf('?');
            const query = queryIndex !== -1 ? hash.substring(queryIndex) : '';
            iframeUrl = '/ghost/form-builder/builder' + query;
        }

        let iframe = fbContainer.querySelector('iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: transparent;';
            fbContainer.appendChild(iframe);
        }

        const currentSrc = iframe.getAttribute('src');
        if (currentSrc !== iframeUrl) {
            iframe.setAttribute('src', iframeUrl);
        }

        // Highlight our custom sidebar button to look active if the sidebar was visible
        const navLink = document.getElementById('ghost-formbuilder-nav');
        if (navLink) {
            navLink.classList.add('active');
        }
    }

    function hideFormConsole() {
        const emberApp = document.getElementById('ember-app');
        const reactApp = document.getElementById('root');
        
        if (emberApp) emberApp.style.removeProperty('display');
        if (reactApp) reactApp.style.removeProperty('display');

        if (fbContainer) {
            fbContainer.style.display = 'none';
            fbContainer.innerHTML = '';
        }

        const navLink = document.getElementById('ghost-formbuilder-nav');
        if (navLink) {
            navLink.classList.remove('active');
        }
    }

    window.addEventListener('hashchange', handleHashChange);

    const observer = new MutationObserver(() => {
        tryInject();
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
        tryInject();
        handleHashChange();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
            tryInject();
            handleHashChange();
        });
    }
})();
