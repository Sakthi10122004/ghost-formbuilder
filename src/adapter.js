const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const router = require('./router');
const { getGhostPath } = require('./utils');

function findAdminHtmlPath() {
    return getGhostPath('core/built/admin/index.html');
}

module.exports = {
    init: () => {
        console.log('[ghost-formbuilder] Initializing Hijack Engine...');

        // Find the admin HTML path once at boot
        const adminHtmlPath = findAdminHtmlPath();
        if (adminHtmlPath) {
            console.log(`[ghost-formbuilder] Admin HTML located at: ${adminHtmlPath}`);
        } else {
            console.warn('[ghost-formbuilder] Could not locate Ghost Admin index.html — sidebar injection will not work.');
        }

        // 1. Create internal Express app for our routes
        const internalApp = express();
        internalApp.use('/ghost/form-builder', router);
        internalApp.use('/form-builder', router);
        
        // Serve UI assets from both paths
        internalApp.use('/ghost/form-builder/ui', express.static(path.join(__dirname, '../ui')));
        internalApp.use('/form-builder/ui', express.static(path.join(__dirname, '../ui')));
        
        internalApp.get('/ghost/form-builder/inject.js', (req, res) => {
            res.setHeader('Content-Type', 'application/javascript');
            res.sendFile(path.join(__dirname, 'frontend-inject.js'));
        });

        // 2. Monkey-Patch http.Server.prototype.emit
        const originalEmit = http.Server.prototype.emit;
        http.Server.prototype.emit = function (type, req, res) {
            if (type === 'request' && req.url) {
                // Route /ghost/form-builder/* and /form-builder/* to our internal app
                if (req.url.startsWith('/ghost/form-builder') || req.url.startsWith('/form-builder')) {
                    internalApp(req, res);
                    return true;
                }

                // Intercept /ghost/ to inject our script tag into the admin HTML
                // We serve a modified copy of the HTML directly from disk
                if (adminHtmlPath && (req.url === '/ghost/' || req.url === '/ghost')) {
                    try {
                        let html = fs.readFileSync(adminHtmlPath, 'utf8');
                        const scriptTag = `<script src="/ghost/form-builder/inject.js" defer></script>`;

                        if (!html.includes('/ghost/form-builder/inject.js')) {
                            html = html.replace('</head>', `  ${scriptTag}\n  </head>`);
                        }

                        res.writeHead(200, {
                            'Content-Type': 'text/html; charset=utf-8',
                            'Content-Length': Buffer.byteLength(html),
                            'Cache-Control': 'no-cache, private'
                        });
                        res.end(html);
                        return true;
                    } catch (e) {
                        console.error('[ghost-formbuilder] Error serving admin HTML:', e.message);
                        // Fall through to Ghost's normal handler
                    }
                }
            }
            return originalEmit.apply(this, arguments);
        };

        console.log('[ghost-formbuilder] HTTP Server Hijack established.');
    }
};
