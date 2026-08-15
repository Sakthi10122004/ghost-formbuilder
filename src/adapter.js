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
        
        let expressLib;
        try {
            expressLib = require(path.join(process.cwd(), 'current/core/shared/express'))._express || require('express');
        } catch (e) {
            expressLib = require('express');
        }
        
        internalApp.get('/ghost/form-builder/inject.js', (req, res) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Content-Type', 'application/javascript');
            res.sendFile(path.join(__dirname, 'frontend-inject.js'));
        });

        if (expressLib && expressLib.response) {
            // Register our script
            global.__ghostCooperativeScripts = global.__ghostCooperativeScripts || [];
            if (!global.__ghostCooperativeScripts.includes('/ghost/form-builder/inject.js')) {
                global.__ghostCooperativeScripts.push('/ghost/form-builder/inject.js');
            }

            // Hook res.send if not already hooked
            if (!expressLib.response._cooperativeSendHooked) {
                const originalSend = expressLib.response.send;
                expressLib.response.send = function(body) {
                    const contentEncoding = this.getHeader('content-encoding');
                    const hasEncoding = contentEncoding && contentEncoding !== 'identity';
                    
                    const contentType = this.getHeader('content-type') || '';
                    const isHtml = !hasEncoding && typeof body === 'string' && (contentType.includes('text/html') || /^\s*(<!DOCTYPE|html)/i.test(body));
                    
                    if (isHtml && body.includes('</head>')) {
                        const scripts = global.__ghostCooperativeScripts || [];
                        let modified = false;
                        scripts.forEach(src => {
                            const tag = `<script src="${src}"></script>`;
                            if (!body.includes(src)) {
                                body = body.replace('</head>', `  ${tag}\n  </head>`);
                                modified = true;
                            }
                        });
                        if (modified) {
                            this.removeHeader('Content-Length');
                        }
                    }
                    return originalSend.call(this, body);
                };
                expressLib.response._cooperativeSendHooked = true;
            }

            // Hook res.sendFile if not already hooked
            if (!expressLib.response._cooperativeSendFileHooked) {
                const cachedIndexHtmlByPath = new Map();
                const originalSendFile = expressLib.response.sendFile;
                expressLib.response.sendFile = function(filePath) {
                    if (filePath && typeof filePath === 'string' && filePath.endsWith('index.html')) {
                        try {
                            const cacheKey = path.resolve(filePath);
                            if (!cachedIndexHtmlByPath.has(cacheKey)) {
                                cachedIndexHtmlByPath.set(cacheKey, fs.readFileSync(filePath, 'utf8'));
                            }
                            this.removeHeader('ETag');
                            this.removeHeader('Content-Length');
                            return this.send(cachedIndexHtmlByPath.get(cacheKey));
                        } catch (e) {
                            console.error('[ghost-formbuilder] Cooperative sendFile error:', e);
                        }
                    }
                    return originalSendFile.apply(this, arguments);
                };
                expressLib.response._cooperativeSendFileHooked = true;
            }
            console.log('[ghost-formbuilder] Cooperative Express hooks registered via global prototype.');
        } else {
            console.warn('[ghost-formbuilder] Could not resolve Express library — sidebar injection will not work.');
        }

        // 3. Monkey-Patch http.Server.prototype.emit (For unique form-builder endpoints only!)
        const originalEmit = http.Server.prototype.emit;
        http.Server.prototype.emit = function (type, req, res) {
            if (type === 'request' && req.url) {
                // Route /ghost/form-builder/* and /form-builder/* to our internal app
                if (req.url.startsWith('/ghost/form-builder') || req.url.startsWith('/form-builder')) {
                    internalApp(req, res);
                    return true;
                }
            }
            return originalEmit.apply(this, arguments);
        };

        console.log('[ghost-formbuilder] HTTP Server Hijack established.');
    }
};
