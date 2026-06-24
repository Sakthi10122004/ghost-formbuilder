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

        // ── Shared Plugin Registry & Controller ───────────────────────────
    if (!window.__ghostPlugins) {
        window.__ghostPlugins = {
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
                    this.closeDashboard();
                    setTimeout(() => {
                        plugin.action();
                    }, 200);
                }
            },
            render: function() {
                const overlay = document.getElementById('ghost-plugins-overlay');
                if (overlay) {
                    this.closeDashboard();
                    this.openDashboard();
                }
            },
            closeDashboard: function() {
                const overlay = document.getElementById('ghost-plugins-overlay');
                if (overlay) {
                    const box = document.getElementById('ghost-plugins-modal-box');
                    if (box) box.style.animation = 'pluginsSlideOut 0.2s ease-in forwards';
                    overlay.style.animation = 'pluginsFadeOut 0.2s ease-in forwards';
                    setTimeout(() => { overlay.remove(); }, 180);
                }
            },
            openDashboard: async function() {
                if (document.getElementById('ghost-plugins-overlay')) return;
                
                const isDark = document.documentElement.classList.contains('dark');
                const overlay = document.createElement('div');
                overlay.id = 'ghost-plugins-overlay';
                overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background-color: rgba(8, 9, 12, 0.45); backdrop-filter: blur(4px);
                    z-index: 999998; display: flex; justify-content: center; align-items: center;
                    animation: pluginsFadeIn 0.2s ease-out;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                `;
                
                const GENERIC_TRUSTED_ICON = `
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                    </svg>
                `.trim();

                const registry = this.registry || [];
                const cardsContainer = document.createElement('div');
                
                for (const plugin of registry) {
                    let isActive = true;
                    if (typeof plugin.checkActive === 'function') {
                        try {
                            isActive = await plugin.checkActive();
                        } catch (e) {
                            console.error(`[${plugin.name}] Failed to fetch active status:`, e);
                            isActive = false;
                        }
                    }

                    const statusColor = isActive ? (isDark ? '#34d399' : '#10b981') : (isDark ? '#9ca3af' : '#6b7280');
                    const statusText = isActive ? 'Active' : 'Inactive';
                    const shadowStyle = isActive ? `box-shadow: 0 0 8px ${statusColor};` : '';

                    const card = document.createElement('div');
                    card.className = 'plugin-card';
                    card.style.cssText = `display: flex; align-items: center; padding: 18px; background: ${isDark ? '#191b1f' : '#f9fafb'}; border: 1px solid ${isDark ? '#2a2e35' : '#e5e7eb'}; border-radius: 10px; margin-bottom: 12px; transition: all 0.2s ease;`;

                    const iconDiv = document.createElement('div');
                    iconDiv.className = 'plugin-icon';
                    iconDiv.style.cssText = `width: 42px; height: 42px; border-radius: 8px; background: ${isDark ? '#24272d' : '#f3f4f6'}; display: flex; justify-content: center; align-items: center; margin-right: 16px; color: ${isDark ? '#e1e3e6' : '#1f2937'}; flex-shrink: 0;`;
                    iconDiv.innerHTML = plugin.icon || GENERIC_TRUSTED_ICON;
                    card.appendChild(iconDiv);

                    const bodyDiv = document.createElement('div');
                    bodyDiv.className = 'plugin-card-body';
                    bodyDiv.style.cssText = 'flex-grow: 1; min-width: 0; margin-right: 16px;';

                    const titleBlock = document.createElement('div');
                    titleBlock.style.cssText = 'display: flex; align-items: center; margin-bottom: 4px;';

                    const title = document.createElement('h4');
                    title.style.cssText = `margin: 0; font-size: 15px; font-weight: 600; color: ${isDark ? '#f3f4f6' : '#111827'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
                    title.textContent = plugin.name;
                    titleBlock.appendChild(title);

                    const versionSpan = document.createElement('span');
                    versionSpan.style.cssText = `font-size: 11px; color: ${isDark ? '#9ca3af' : '#6b7280'}; margin-left: 8px; padding: 1px 6px; background: ${isDark ? '#24272d' : '#f3f4f6'}; border-radius: 4px; font-weight: 500;`;
                    versionSpan.textContent = 'v' + (plugin.version || '1.0.0');
                    titleBlock.appendChild(versionSpan);

                    bodyDiv.appendChild(titleBlock);

                    const description = document.createElement('p');
                    description.style.cssText = `margin: 0; font-size: 13px; color: ${isDark ? '#9ca3af' : '#4b5563'}; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;`;
                    description.textContent = plugin.description || '';
                    bodyDiv.appendChild(description);

                    card.appendChild(bodyDiv);

                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'plugin-card-actions';
                    actionsDiv.style.cssText = 'display: flex; align-items: center; flex-shrink: 0;';

                    const statusSpan = document.createElement('span');
                    statusSpan.style.cssText = `display: flex; align-items: center; margin-right: 16px; font-size: 13px; color: ${statusColor}; font-weight: 500;`;

                    const statusDot = document.createElement('span');
                    statusDot.style.cssText = `width: 8px; height: 8px; border-radius: 50%; background-color: ${statusColor}; display: inline-block; margin-right: 6px; ${shadowStyle}`;
                    statusSpan.appendChild(statusDot);
                    
                    const statusTextNode = document.createTextNode(statusText);
                    statusSpan.appendChild(statusTextNode);
                    actionsDiv.appendChild(statusSpan);

                    const configureBtn = document.createElement('button');
                    configureBtn.style.cssText = `padding: 6px 14px; font-size: 13px; font-weight: 500; border-radius: 6px; border: 1px solid ${isDark ? '#3a404a' : '#d1d5db'}; background: ${isDark ? '#24272d' : '#ffffff'}; color: ${isDark ? '#f3f4f6' : '#374151'}; cursor: pointer; transition: all 0.15s ease;`;
                    configureBtn.textContent = 'Configure';
                    configureBtn.addEventListener('click', () => {
                        this.manage(plugin.id);
                    });
                    actionsDiv.appendChild(configureBtn);

                    card.appendChild(actionsDiv);
                    cardsContainer.appendChild(card);
                }
                
                overlay.innerHTML = `
                    <style>
                        @keyframes pluginsFadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes pluginsFadeOut { from { opacity: 1; } to { opacity: 0; } }
                        @keyframes pluginsSlideIn { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                        @keyframes pluginsSlideOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(12px); opacity: 0; } }
                        
                        @media (max-width: 650px) {
                            #ghost-plugins-modal-box {
                                width: 100% !important;
                                height: 100% !important;
                                max-height: 100% !important;
                                border-radius: 0 !important;
                            }
                            .plugin-card {
                                flex-direction: column !important;
                                align-items: flex-start !important;
                                padding: 16px !important;
                            }
                            .plugin-card-body {
                                margin-right: 0 !important;
                                margin-bottom: 12px !important;
                                width: 100% !important;
                            }
                            .plugin-card-actions {
                                width: 100% !important;
                                justify-content: space-between !important;
                                display: flex !important;
                                align-items: center !important;
                            }
                        }
                    </style>
                    <div id="ghost-plugins-modal-box" style="width: 90%; max-width: 680px; height: 80%; max-height: 600px; background: ${isDark ? '#15171a' : '#ffffff'}; border: 1px solid ${isDark ? '#24272c' : '#f0f3f6'}; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column; animation: pluginsSlideIn 0.25s cubic-bezier(0.19, 1, 0.22, 1);">
                        <div style="padding: 24px; border-bottom: 1px solid ${isDark ? '#24272c' : '#f0f3f6'}; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h3 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: ${isDark ? '#f3f4f6' : '#111827'};">Installed Plugins</h3>
                                <p style="margin: 0; font-size: 13.5px; color: ${isDark ? '#9ca3af' : '#6b7280'};">Manage and configure your custom Ghost extensions.</p>
                            </div>
                            <button id="ghost-plugins-close-btn" style="background: none; border: none; color: ${isDark ? '#9ca3af' : '#6b7280'}; cursor: pointer; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div id="ghost-plugins-list" style="flex-grow: 1; overflow-y: auto; padding: 24px;">
                        </div>
                    </div>
                `;
                
                overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeDashboard(); });
                document.body.appendChild(overlay);

                const closeBtn = overlay.querySelector('#ghost-plugins-close-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.closeDashboard());
                }

                const listDiv = overlay.querySelector('#ghost-plugins-list');
                if (listDiv) {
                    if (registry.length > 0) {
                        listDiv.appendChild(cardsContainer);
                    } else {
                        const emptyMsg = document.createElement('div');
                        emptyMsg.style.cssText = 'text-align: center; padding: 48px 0; color: #6b7280;';
                        const emptyText = document.createElement('p');
                        emptyText.style.cssText = 'margin: 0; font-size: 15px; font-weight: 500;';
                        emptyText.textContent = 'No active plugins detected.';
                        emptyMsg.appendChild(emptyText);
                        listDiv.appendChild(emptyMsg);
                    }
                }
            },
            injectTab: function() {
                if (document.getElementById('ghost-plugins-nav-item')) {
                    return true;
                }

                if (this.registry.length === 0) {
                    return false;
                }

                const settingsLink = document.querySelector('[data-test-nav="settings"]')
                                  || document.querySelector('a[href*="settings"]')
                                  || document.querySelector('.gh-nav-bottom a');
                                  
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

                    const settingsSpan = settingsLink.querySelector('span');
                    
                    let svgHtml = `
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-right: 12px; vertical-align: middle;">
                            <rect x="3" y="3" width="7" height="9"></rect>
                            <rect x="14" y="3" width="7" height="5"></rect>
                            <rect x="14" y="12" width="7" height="9"></rect>
                            <rect x="3" y="16" width="7" height="5"></rect>
                        </svg>
                    `;

                    let spanHtml = settingsSpan 
                        ? `<span class="${settingsSpan.className}" style="vertical-align: middle;">Installed Plugins</span>`
                        : `<span style="vertical-align: middle;">Installed Plugins</span>`;

                    a.innerHTML = svgHtml + '\n' + spanHtml;
                    
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.openDashboard();
                    });
                    
                    li.appendChild(a);
                    settingsLi.parentElement.insertBefore(li, settingsLi);
                    console.log('[ghost-plugins] Injected Unified Plugins option tab in sidebar.');
                    return true;
                }
                return false;
            }
        };
    }

    
    window.__ghostPlugins.register({
        id: 'formbuilder',
        name: 'Form Builder',
        description: 'Create and manage custom forms directly from your Ghost admin panel.',
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
        checkActive: async () => true,
        action: () => {
            window.location.hash = '#/form-builder';
        }
    });

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
        if (window.__ghostPlugins) {
            window.__ghostPlugins.injectTab();
        }
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
        if (window.__ghostPlugins) window.__ghostPlugins.injectTab();
        handleHashChange();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
            if (window.__ghostPlugins) window.__ghostPlugins.injectTab();
            handleHashChange();
        });
    }
})();
