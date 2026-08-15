(function () {
    'use strict';

    // ── Shared Plugin Registry & Controller ───────────────────────────
    if (!window.__GHOST_PLUGINS_REGISTRY__) {
        window.__GHOST_PLUGINS_REGISTRY__ = {
            plugins: [],
            register: function (plugin) {
                if (!this.plugins.some(p => p.id === plugin.id)) {
                    this.plugins.push(plugin);
                    this.render();
                }
            },
            togglePanel: function (id) {
                const panel = document.getElementById('ghost-plugin-panel-' + id);
                const btn = document.getElementById('ghost-plugin-btn-' + id);
                if (panel && btn) {
                    const isHidden = panel.classList.contains('hidden');
                    if (isHidden) {
                        panel.classList.remove('hidden');
                        btn.textContent = 'Close';
                    } else {
                        panel.classList.add('hidden');
                        btn.textContent = 'Open';
                    }
                }
            },
            render: function () {
                // 1. Inject into Sidebar ("Advanced" Section)
                const sidebar = document.getElementById('admin-x-settings-sidebar');
                if (sidebar && !document.getElementById('ghost-plugins-sidebar-link')) {
                    // Find the "Advanced" heading - it's an h2 rendered inside the nav
                    const allHeadings = Array.from(sidebar.querySelectorAll('h2, h3, span, div'));
                    const advancedHeading = allHeadings.find(function(el) {
                        var text = el.textContent.trim().toLowerCase();
                        return text === 'advanced' && (el.tagName === 'H2' || el.tagName === 'H3');
                    });

                    if (advancedHeading) {
                        // Walk siblings and ancestors to find the nearest <ul> after the heading
                        var ul = null;
                        var sibling = advancedHeading.nextElementSibling;
                        // Direct sibling check
                        while (sibling) {
                            if (sibling.tagName === 'UL') { ul = sibling; break; }
                            var nested = sibling.querySelector('ul');
                            if (nested) { ul = nested; break; }
                            sibling = sibling.nextElementSibling;
                        }
                        // If not found as sibling, try parent's next sibling (React fragments)
                        if (!ul) {
                            var parent = advancedHeading.parentElement;
                            if (parent) {
                                sibling = parent.nextElementSibling;
                                while (sibling) {
                                    if (sibling.tagName === 'UL') { ul = sibling; break; }
                                    var nestedUl = sibling.querySelector('ul');
                                    if (nestedUl) { ul = nestedUl; break; }
                                    sibling = sibling.nextElementSibling;
                                }
                            }
                        }
                        // Final fallback: find any <ul> that appears after the heading in DOM order
                        if (!ul) {
                            var allUls = Array.from(sidebar.querySelectorAll('ul'));
                            for (var i = 0; i < allUls.length; i++) {
                                if (advancedHeading.compareDocumentPosition(allUls[i]) & Node.DOCUMENT_POSITION_FOLLOWING) {
                                    ul = allUls[i];
                                    break;
                                }
                            }
                        }

                        if (ul) {
                            var li = document.createElement('li');
                            var templateLink = sidebar.querySelector('a#integrations') || sidebar.querySelector('a');
                            
                            if (templateLink) {
                                var clonedLink = templateLink.cloneNode(true);
                                clonedLink.id = 'ghost-plugins-sidebar-link';
                                clonedLink.removeAttribute('href'); // Remove href to prevent breaking React hash routing
                                clonedLink.removeAttribute('data-testid'); // Clean up any react test ids
                                
                                // Ensure it's not styled as "active" (Ghost uses these specific classes for active states)
                                clonedLink.className = clonedLink.className.replace(/bg-\[#243043\]/g, '').replace(/bg-\[#202630\]/g, '').replace(/text-white/g, 'text-[#c8ccd3]').replace(/bg-grey-100/g, '').replace(/bg-black/g, '');
                                
                                // Ensure hover classes exist
                                if (!clonedLink.className.includes('hover:')) {
                                    clonedLink.className += ' hover:bg-white/5';
                                }

                                // Swap SVG icon to puzzle piece
                                var svg = clonedLink.querySelector('svg');
                                if (svg) {
                                    svg.innerHTML = '<path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.611c-.946.946-2.461.946-3.408 0L8.73 19.73a.98.98 0 0 1-.276-.837c.07-.47.48-.802.925-.968a2.5 2.5 0 1 0-3.214-3.214c-.166-.446-.497-.855-.968-.925a.979.979 0 0 1-.837-.276L2.748 11.9a2.42 2.42 0 0 1 0-3.408l1.568-1.568a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.611c.946-.946 2.461-.946 3.408 0l1.568 1.568a.98.98 0 0 1 .276.837c-.07.47-.48.802-.925.968a2.5 2.5 0 1 0 3.214 3.214c.166.446.497.855.968.925Z"></path>';
                                }
                                
                                // Swap text
                                for (var i = 0; i < clonedLink.childNodes.length; i++) {
                                    var node = clonedLink.childNodes[i];
                                    if (node.nodeType === 3 && node.nodeValue.trim().length > 0) {
                                        node.nodeValue = 'Installed Plugins';
                                        break;
                                    }
                                }
                                
                                clonedLink.addEventListener('click', function(e) {
                                    e.preventDefault();
                                    var target = document.getElementById('installed-plugins');
                                    var scroller = document.getElementById('admin-x-settings-scroller');
                                    if (target && scroller) {
                                        // Calculate offset to account for sticky header
                                        var targetPos = target.offsetTop;
                                        scroller.scrollTo({ top: targetPos - 60, behavior: 'smooth' });
                                    } else if (target) {
                                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                });
                                
                                li.appendChild(clonedLink);
                            } else {
                                // Ultimate fallback if cloning fails completely
                                li.innerHTML = '<button id="ghost-plugins-sidebar-link" type="button" class="group flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-md px-2 py-1.5 text-left text-[14px] leading-5 transition-all hover:bg-grey-100 dark:hover:bg-grey-900" style="border:none;background:none;">' +
                                    '<div class="flex items-center gap-2.5">' +
                                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 shrink-0 text-grey-900 dark:text-grey-300 transition-colors group-hover:text-black dark:group-hover:text-white">' +
                                    '<path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.611c-.946.946-2.461.946-3.408 0L8.73 19.73a.98.98 0 0 1-.276-.837c.07-.47.48-.802.925-.968a2.5 2.5 0 1 0-3.214-3.214c-.166-.446-.497-.855-.968-.925a.979.979 0 0 1-.837-.276L2.748 11.9a2.42 2.42 0 0 1 0-3.408l1.568-1.568a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.611c.946-.946 2.461-.946 3.408 0l1.568 1.568a.98.98 0 0 1 .276.837c-.07.47-.48.802-.925.968a2.5 2.5 0 1 0 3.214 3.214c.166.446.497.855.968.925Z"></path>' +
                                    '</svg>' +
                                    '<span class="font-medium text-grey-900 dark:text-grey-300 transition-colors group-hover:text-black dark:group-hover:text-white">Installed Plugins</span>' +
                                    '</div>' +
                                    '</button>';
                                
                                li.querySelector('button').addEventListener('click', function(e) {
                                    e.preventDefault();
                                    var target = document.getElementById('installed-plugins');
                                    if (target) {
                                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                });
                            }

                            ul.prepend(li);
                            console.log('[mailconfig] Sidebar link injected successfully');
                        } else {
                            console.warn('[mailconfig] Could not find <ul> near Advanced heading');
                        }
                    }
                }

                // 2. Inject Master Card inside Scroller
                var scroller = document.getElementById('admin-x-settings-scroller');
                if (scroller && !document.getElementById('installed-plugins')) {
                    // Find anchor card using data-testid attributes
                    var anchorCard = document.querySelector('[data-testid="integrations"]')
                                 || document.querySelector('[data-testid="code-injection"]')
                                 || document.querySelector('[data-testid="labs"]')
                                 || document.querySelector('[data-testid="dangerzone"]');

                    var masterCard = document.createElement('div');
                    masterCard.id = 'installed-plugins';
                    masterCard.setAttribute('data-testid', 'installed-plugins');
                    masterCard.className = 'relative flex flex-col gap-6 rounded-xl border border-grey-200 dark:border-grey-900 bg-white dark:bg-[#101114] p-5 md:p-7 mb-6 shadow-sm';
                    masterCard.style.cssText = '';
                    masterCard.innerHTML = '<div class="flex items-start justify-between gap-4">' +
                        '<div class="flex flex-col gap-1">' +
                        '<h2 style="margin:0;font-size:1.5rem;font-weight:700;letter-spacing:-0.015em;" class="text-grey-900 dark:text-white">Installed Plugins</h2>' +
                        '<p class="m-0 text-[15px] text-grey-700 dark:text-grey-400">Manage custom system extensions and integrations.</p>' +
                        '</div>' +
                        '</div>' +
                        '<div id="ghost-plugins-card-content" class="flex flex-col gap-6"></div>';

                    if (anchorCard && anchorCard.parentNode) {
                        anchorCard.parentNode.insertBefore(masterCard, anchorCard);
                        console.log('[mailconfig] Plugin card injected before', anchorCard.getAttribute('data-testid'));
                    } else {
                        // Fallback: append to scroller's deepest content container
                        var fallbackContainer = scroller.querySelector('.mx-auto') || scroller.firstElementChild || scroller;
                        fallbackContainer.appendChild(masterCard);
                        console.log('[mailconfig] Plugin card appended to scroller (fallback)');
                    }
                }

                // 3. Render Registered Plugin Panels
                var pluginsContainer = document.getElementById('ghost-plugins-card-content');
                if (pluginsContainer) {
                    this.plugins.forEach(plugin => {
                        if (!document.getElementById('ghost-plugin-wrapper-' + plugin.id)) {
                            const wrapper = document.createElement('div');
                            wrapper.id = 'ghost-plugin-wrapper-' + plugin.id;
                            wrapper.className = 'flex flex-col gap-4 border-t border-grey-200 dark:border-grey-900 pt-4 first:border-t-0 first:pt-0';

                            wrapper.innerHTML = `
                                <div class="flex items-center justify-between gap-4">
                                    <div class="flex items-center gap-3">
                                        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-grey-100 text-grey-800 dark:bg-grey-900 dark:text-grey-100">
                                            ${plugin.svgIcon}
                                        </div>
                                        <div class="flex flex-col">
                                            <span class="text-[15px] font-semibold text-grey-900 dark:text-white">${plugin.title}</span>
                                            ${plugin.description ? `<span class="text-[13px] text-grey-700 dark:text-grey-400 mt-0.5">${plugin.description}</span>` : ''}
                                        </div>
                                    </div>
                                    <button id="ghost-plugin-btn-${plugin.id}" class="h-7 rounded-md px-3 text-sm font-medium hover:bg-grey-100 dark:hover:bg-grey-900 text-grey-900 dark:text-white transition-colors border border-grey-200 dark:border-grey-900 cursor-pointer">Open</button>
                                </div>
                                <div id="ghost-plugin-panel-${plugin.id}" class="hidden rounded-lg bg-grey-50 dark:bg-grey-950 p-4 border border-grey-200 dark:border-grey-900 text-sm text-grey-900 dark:text-white">
                                    ${plugin.renderInlineContent()}
                                </div>
                            `;

                            pluginsContainer.appendChild(wrapper);

                            // Delegate click directly on element rather than global inline function
                            const btn = wrapper.querySelector(`#ghost-plugin-btn-${plugin.id}`);
                            if (btn) {
                                btn.addEventListener('click', () => {
                                    window.__GHOST_PLUGINS_REGISTRY__.togglePanel(plugin.id);
                                });
                            }

                            if (typeof plugin.onMount === 'function') {
                                plugin.onMount();
                            }
                        }
                    });
                }
            }
        };

        // Mutation Observer to continuous re-evaluate DOM changes (React Page Swaps)
        const observer = new MutationObserver(() => {
            window.__GHOST_PLUGINS_REGISTRY__.render();
        });

        const startObserver = () => {
            observer.observe(document.body, { childList: true, subtree: true });
            window.__GHOST_PLUGINS_REGISTRY__.render();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserver);
        } else {
            startObserver();
        }
    }

    // ── Register FormBuilder Plugin ───────────────────────────────
    window.__GHOST_PLUGINS_REGISTRY__.register({
        id: 'ghost-formbuilder',
        title: 'FormBuilder',
        svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
        renderInlineContent: () => {
            return `
                <div class="flex flex-col gap-4">
                    <p class="m-0 text-[15px] text-grey-700 dark:text-grey-400">
                        Design custom drag-and-drop forms, generate embed snippets, and view user submissions.
                    </p>
                    <div class="flex items-center justify-between p-3 rounded-md border border-grey-200 dark:border-grey-900 bg-white dark:bg-black mt-2">
                        <div class="flex flex-col gap-1">
                            <span class="text-sm font-semibold text-grey-900 dark:text-white uppercase tracking-wide">Form Dashboard</span>
                            <span class="text-[13px] text-grey-500">Launch the form builder and submission console</span>
                        </div>
                        <a href="/ghost/form-builder/" class="h-8 flex items-center rounded-md px-4 text-sm font-medium bg-black text-white hover:bg-grey-900 dark:bg-white dark:text-black dark:hover:bg-grey-200 transition-colors cursor-pointer shadow-sm no-underline" style="text-decoration: none;">
                            Open Manager
                        </a>
                    </div>
                </div>
            `;
        }
    });

})();
