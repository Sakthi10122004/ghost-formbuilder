const fs = require('fs');
const path = require('path');
const localExpress = require('express');
let ghostExpress;
try {
    ghostExpress = require(path.join(process.cwd(), 'current/core/shared/express'))._express;
} catch (e) {
    ghostExpress = localExpress;
}
const http = require('http');
const router = require('./router');
const { getGhostPath } = require('./utils');

const cachedIndexHtmlByPath = new Map();

module.exports = {
    init: () => {
        console.log('[ghost-formbuilder] Initializing Hijack Engine...');

        // Register our script for cooperative injection
        global.__ghostCooperativeScripts = global.__ghostCooperativeScripts || [];
        if (!global.__ghostCooperativeScripts.includes('/ghost/form-builder/inject.js')) {
            global.__ghostCooperativeScripts.push('/ghost/form-builder/inject.js');
        }

        if (ghostExpress && ghostExpress.response) {
            if (!ghostExpress.response._cooperativeSendHooked) {
                const originalSend = ghostExpress.response.send;
                ghostExpress.response.send = function(body) {
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
                ghostExpress.response._cooperativeSendHooked = true;
            }

            if (!ghostExpress.response._cooperativeSendFileHooked) {
                const originalSendFile = ghostExpress.response.sendFile;
                ghostExpress.response.sendFile = function(filePath) {
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
                ghostExpress.response._cooperativeSendFileHooked = true;
            }
        }

        // 1. Create internal Express app for our routes
        const internalApp = localExpress();
        internalApp.use('/ghost/form-builder', router);
        internalApp.use('/form-builder', router);
        
        const serveEmbedJs = async (req, res) => {
            try {
                const fs = require('fs');
                const formStore = require('./formStorage');
                const forms = await formStore.listForms();
                const layoutMap = {};
                forms.forEach(f => layoutMap[f.id] = f.layout);
                
                let rawJs = fs.readFileSync(path.join(__dirname, '../ui/embed.js'), 'utf8');
                rawJs = `window.__fbLayoutMap = ${JSON.stringify(layoutMap)};\n` + rawJs;
                
                res.setHeader('Content-Type', 'application/javascript');
                res.send(rawJs);
            } catch(e) {
                console.error('[ghost-formbuilder] Failed to serve embed.js:', e);
                res.status(500).send('console.error("Failed to load embed.js");');
            }
        };
        
        internalApp.get('/ghost/form-builder/ui/embed.js', serveEmbedJs);
        internalApp.get('/form-builder/ui/embed.js', serveEmbedJs);

        // Serve UI assets from both paths
        internalApp.use('/ghost/form-builder/ui', localExpress.static(path.join(__dirname, '../ui')));
        internalApp.use('/form-builder/ui', localExpress.static(path.join(__dirname, '../ui')));
        
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
            }
            return originalEmit.apply(this, arguments);
        };

        console.log('[ghost-formbuilder] ✅ HTTP Server Hijack established cooperatively.');
    }
};
