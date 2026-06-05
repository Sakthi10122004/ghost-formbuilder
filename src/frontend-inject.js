(function() {
    'use strict';
    console.log('[ghost-formbuilder] Admin UI Injector Booted.');

    // ── Shared Plugin Registry & Controller ───────────────────────────
    window.__ghostPlugins = window.__ghostPlugins || {
        registry: [],
        register: function(plugin) {
            if (!this.registry.some(p => p.id === plugin.id)) {
                this.registry.push(plugin);
                this.render();
            }
        },
        manage: function(id) {
            const plugin = this.registry.find(p => p.id === id);
            if (plugin && typeof plugin.action === 'function') {
                window.closePluginsDashboard();
                setTimeout(() => {
                    plugin.action();
                }, 200);
            }
        },
        render: function() {
            const overlay = document.getElementById('ghost-plugins-overlay');
            if (overlay) {
                window.closePluginsDashboard();
                window.openPluginsDashboard();
            }
        }
    };

    // ── Unified Installed Plugins Tab Injector ────────────────────────
    let pluginsTabInjected = false;

    function injectPluginsTab() {
        if (document.getElementById('ghost-plugins-nav-item')) {
            pluginsTabInjected = true;
            return true;
        }

        // Only inject if there are actually plugins registered
        if (!window.__ghostPlugins || !window.__ghostPlugins.registry || window.__ghostPlugins.registry.length === 0) {
            return false;
        }

        const settingsLink = document.querySelector('a[href="#/settings/"]') 
                          || document.querySelector('[data-test-nav="settings"]')
                          || document.querySelector('a[href*="settings"]');
                          
        if (settingsLink) {
            const settingsLi = settingsLink.closest('li') || settingsLink.parentElement;
            if (!settingsLi || !settingsLi.parentElement) return false;

            const li = document.createElement(settingsLi.tagName);
            li.id = 'ghost-plugins-nav-item';
            li.className = settingsLi.className;
            
            const a = document.createElement(settingsLink.tagName);
            a.id = 'ghost-plugins-nav-link';
            a.href = '#';
            
            const classes = settingsLink.className.split(' ').filter(c => !c.toLowerCase().includes('active'));
            a.className = classes.join(' ');

            const settingsSvg = settingsLink.querySelector('svg');
            const settingsSpan = settingsLink.querySelector('span');
            
            let svgHtml = '';
            if (settingsSvg) {
                const clonedSvg = settingsSvg.cloneNode(true);
                clonedSvg.setAttribute('viewBox', '0 0 24 24');
                clonedSvg.setAttribute('fill', 'none');
                clonedSvg.setAttribute('stroke', 'currentColor');
                clonedSvg.setAttribute('stroke-width', '1.8');
                clonedSvg.setAttribute('stroke-linecap', 'round');
                clonedSvg.setAttribute('stroke-linejoin', 'round');
                clonedSvg.innerHTML = `
                    <rect x="3" y="3" width="7" height="9"></rect>
                    <rect x="14" y="3" width="7" height="5"></rect>
                    <rect x="14" y="12" width="7" height="9"></rect>
                    <rect x="3" y="16" width="7" height="5"></rect>
                `;
                svgHtml = clonedSvg.outerHTML;
            } else {
                svgHtml = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-right: 12px; vertical-align: middle;">
                        <rect x="3" y="3" width="7" height="9"></rect>
                        <rect x="14" y="3" width="7" height="5"></rect>
                        <rect x="14" y="12" width="7" height="9"></rect>
                        <rect x="3" y="16" width="7" height="5"></rect>
                    </svg>
                `;
            }

            let spanHtml = '';
            if (settingsSpan) {
                const clonedSpan = settingsSpan.cloneNode(true);
                clonedSpan.textContent = 'Installed Plugins';
                spanHtml = clonedSpan.outerHTML;
            } else {
                spanHtml = `<span style="vertical-align: middle;">Installed Plugins</span>`;
            }

            a.innerHTML = svgHtml + '\n' + spanHtml;
            
            a.addEventListener('click', (e) => {
                e.preventDefault();
                window.openPluginsDashboard();
            });
            
            li.appendChild(a);
            
            // Insert Plugins tab right above Settings tab
            settingsLi.parentElement.insertBefore(li, settingsLi);
            pluginsTabInjected = true;
            console.log('[ghost-plugins] Injected Unified Plugins option tab in sidebar (from Form Builder).');
            return true;
        }
        return false;
    }

    // ── Installed Plugins Dashboard Overlay UI ────────────────────────
    window.openPluginsDashboard = function() {
        if (document.getElementById('ghost-plugins-overlay')) return;
        
        const isDark = document.documentElement.classList.contains('dark');
        
        const overlay = document.createElement('div');
        overlay.id = 'ghost-plugins-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(8, 9, 12, 0.45);
            backdrop-filter: blur(4px);
            z-index: 999998;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: pluginsFadeIn 0.2s ease-out;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;
        
        let cardsHtml = '';
        const registry = window.__ghostPlugins.registry || [];
        
        registry.forEach(plugin => {
            cardsHtml += `
                <div class="plugin-card" style="
                    display: flex;
                    align-items: center;
                    padding: 18px;
                    background: ${isDark ? '#191b1f' : '#f9fafb'};
                    border: 1px solid ${isDark ? '#2a2e35' : '#e5e7eb'};
                    border-radius: 10px;
                    margin-bottom: 12px;
                    transition: all 0.2s ease;
                ">
                    <div class="plugin-icon" style="
                        width: 42px;
                        height: 42px;
                        border-radius: 8px;
                        background: ${isDark ? '#24272d' : '#f3f4f6'};
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        margin-right: 16px;
                        color: ${isDark ? '#e1e3e6' : '#1f2937'};
                        flex-shrink: 0;
                    ">
                        ${plugin.icon || ''}
                    </div>
                    <div style="flex-grow: 1; min-width: 0; margin-right: 16px;">
                        <div style="display: flex; align-items: center; margin-bottom: 4px;">
                            <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: ${isDark ? '#f3f4f6' : '#111827'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${plugin.name}</h4>
                            <span style="font-size: 11px; color: ${isDark ? '#9ca3af' : '#6b7280'}; margin-left: 8px; padding: 1px 6px; background: ${isDark ? '#24272d' : '#f3f4f6'}; border-radius: 4px; font-weight: 500;">v${plugin.version || '1.0.0'}</span>
                        </div>
                        <p style="margin: 0; font-size: 13px; color: ${isDark ? '#9ca3af' : '#4b5563'}; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${plugin.description || ''}</p>
                    </div>
                    <div style="display: flex; align-items: center; flex-shrink: 0;">
                        <span style="display: flex; align-items: center; margin-right: 16px; font-size: 13px; color: ${isDark ? '#34d399' : '#10b981'}; font-weight: 500;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${isDark ? '#34d399' : '#10b981'}; display: inline-block; margin-right: 6px; box-shadow: 0 0 8px ${isDark ? '#34d399' : '#10b981'};"></span>
                            Active
                        </span>
                        <button onclick="window.__ghostPlugins.manage('${plugin.id}')" style="
                            padding: 6px 14px;
                            font-size: 13px;
                            font-weight: 500;
                            border-radius: 6px;
                            border: 1px solid ${isDark ? '#3a404a' : '#d1d5db'};
                            background: ${isDark ? '#24272d' : '#ffffff'};
                            color: ${isDark ? '#f3f4f6' : '#374151'};
                            cursor: pointer;
                            transition: all 0.15s ease;
                        " onmouseover="this.style.background='${isDark ? '#2e323b' : '#f9fafb'}'; this.style.borderColor='${isDark ? '#4f5664' : '#babcbf'}'" onmouseout="this.style.background='${isDark ? '#24272d' : '#ffffff'}'; this.style.borderColor='${isDark ? '#3a404a' : '#d1d5db'}'">
                            Configure
                        </button>
                    </div>
                </div>
            `;
        });
        
        overlay.innerHTML = `
            <style>
                @keyframes pluginsFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes pluginsFadeOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes pluginsSlideIn { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes pluginsSlideOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(12px); opacity: 0; } }
                .plugin-card:hover {
                    border-color: ${isDark ? '#4f5664' : '#babcbf'} !important;
                    background: ${isDark ? '#1f2127' : '#f3f4f6'} !important;
                }
            </style>
            <div id="ghost-plugins-modal-box" style="
                width: 90%; 
                max-width: 680px; 
                height: 80%; 
                max-height: 600px; 
                background: ${isDark ? '#15171a' : '#ffffff'}; 
                border: 1px solid ${isDark ? '#24272c' : '#f0f3f6'}; 
                border-radius: 12px; 
                overflow: hidden; 
                box-shadow: 0 20px 40px rgba(0,0,0,0.2); 
                display: flex; 
                flex-direction: column; 
                animation: pluginsSlideIn 0.25s cubic-bezier(0.19, 1, 0.22, 1);
            ">
                <!-- Modal Header -->
                <div style="
                    padding: 24px;
                    border-bottom: 1px solid ${isDark ? '#24272c' : '#f0f3f6'};
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <h3 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: ${isDark ? '#f3f4f6' : '#111827'};">Installed Plugins</h3>
                        <p style="margin: 0; font-size: 13.5px; color: ${isDark ? '#9ca3af' : '#6b7280'};">Manage and configure your custom Ghost extensions.</p>
                    </div>
                    <button onclick="window.closePluginsDashboard()" style="
                        background: none;
                        border: none;
                        color: ${isDark ? '#9ca3af' : '#6b7280'};
                        cursor: pointer;
                        padding: 6px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background 0.15s ease;
                    " onmouseover="this.style.background='${isDark ? '#24272c' : '#f3f4f6'}'" onmouseout="this.style.background='none'">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <!-- Modal Body -->
                <div style="flex-grow: 1; overflow-y: auto; padding: 24px;">
                    ${cardsHtml || `
                        <div style="text-align: center; padding: 48px 0; color: ${isDark ? '#9ca3af' : '#6b7280'};">
                            <p style="margin: 0; font-size: 15px; font-weight: 500;">No active plugins detected.</p>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                window.closePluginsDashboard();
            }
        });
        
        document.body.appendChild(overlay);
        
        const navLink = document.getElementById('ghost-plugins-nav-link');
        if (navLink) {
            navLink.classList.add('active');
        }
    };

    window.closePluginsDashboard = function() {
        const overlay = document.getElementById('ghost-plugins-overlay');
        if (overlay) {
            const box = document.getElementById('ghost-plugins-modal-box');
            if (box) box.style.animation = 'pluginsSlideOut 0.2s ease-in forwards';
            overlay.style.animation = 'pluginsFadeOut 0.2s ease-in forwards';
            
            setTimeout(() => {
                overlay.remove();
                const navLink = document.getElementById('ghost-plugins-nav-link');
                if (navLink) {
                    navLink.classList.remove('active');
                }
            }, 180);
        }
    };

    // ── Self Registration ─────────────────────────────────────────────
    window.__ghostPlugins.register({
        id: 'ghost-formbuilder',
        name: 'Forms',
        description: 'Design and embed beautiful, custom forms, collect responses, and view analytics natively.',
        version: '1.0.0',
        icon: `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
        `,
        action: () => {
            window.location.hash = '#/form-builder';
        }
    });

    // Theme and active styling sync
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

    // ── Individual Forms Button Injector ─────────────────────────────────
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
            <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-right: 12px; vertical-align: middle;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span style="vertical-align: middle;">Forms</span>
        `;

        a.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#/form-builder';
        });

        li.appendChild(a);
        return li;
    }

    function tryInject() {
        // Run cooperative Plugins tab injection
        injectPluginsTab();
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
