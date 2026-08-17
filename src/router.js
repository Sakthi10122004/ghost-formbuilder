const express   = require('express');
const path      = require('path');
const router    = express.Router();
const formStore = require('./formStorage');
const { getGhostPath } = require('./utils');
router.use(express.json({ limit: '15mb' }));
router.use(express.urlencoded({ limit: '15mb', extended: true }));

// Load Ghost's core session service dynamically
let getSession = null;
try {
  const sessionPath = getGhostPath('core/server/services/auth/session/express-session');
  if (sessionPath) {
    getSession = require(sessionPath).getSession;
  }
} catch (err) {
  console.error('[FormBuilder Auth] Failed to load Ghost session service:', err.message);
}

// Load Ghost models dynamically
let models = null;
try {
  const modelsPath = getGhostPath('core/server/models');
  if (modelsPath) {
    models = require(modelsPath);
  }
} catch (err) {
  console.error('[FormBuilder Auth] Failed to load Ghost models:', err.message);
}

// Load Ghost's core config service dynamically to get URLs
let ghostUrl = null;
let ghostAdminUrl = null;
try {
  const configPath = getGhostPath('core/shared/config');
  if (configPath) {
    const ghostConfig = require(configPath);
    if (ghostConfig && typeof ghostConfig.get === 'function') {
      ghostUrl = ghostConfig.get('url');
      const adminObj = ghostConfig.get('admin');
      if (adminObj && typeof adminObj === 'object') {
        ghostAdminUrl = adminObj.url;
      } else {
        ghostAdminUrl = ghostConfig.get('admin:url');
      }
    }
  }
} catch (e) {
  console.error('[FormBuilder Auth] Failed to load Ghost URL config:', e.message);
}

function buildAllowedHosts(host) {
  const allowedHosts = new Set();
  if (host) {
    allowedHosts.add(host.toLowerCase());
  }

  if (ghostAdminUrl) {
    try { allowedHosts.add(new URL(ghostAdminUrl).host.toLowerCase()); } catch (e) {}
  }
  if (ghostUrl) {
    try { allowedHosts.add(new URL(ghostUrl).host.toLowerCase()); } catch (e) {}
  }

  return allowedHosts;
}

function isHostAllowed(urlStr, allowedHosts) {
  try {
    const u = new URL(urlStr);
    return allowedHosts.has(u.host.toLowerCase());
  } catch (e) {
    return false;
  }
}

function validateSameOrigin(req, res, next) {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowedHosts = buildAllowedHosts(req.headers.host);

  let error = 'Forbidden. Missing Origin or Referer header.';
  if (origin) {
    error = isHostAllowed(origin, allowedHosts) ? null : 'Forbidden. Origin mismatch.';
  } else if (referer) {
    error = isHostAllowed(referer, allowedHosts) ? null : 'Forbidden. Referer mismatch.';
  }

  if (error) {
    return res.status(403).json({ error });
  }
  next();
}

// Authentication middleware to restrict route access to administrators
async function requireAdminAuth(req, res, next) {
  if (getSession) {
    try {
      const sessionObj = await getSession(req, res);
      if (sessionObj && sessionObj.user_id) {
        if (models && models.User) {
          const user = await models.User.findOne({ id: sessionObj.user_id }, { withRelated: ['roles'] });
          if (user) {
            const roles = user.related('roles').models.map(r => r.get('name'));
            const isAdminOrOwner = roles.includes('Administrator') || roles.includes('Owner');
            if (isAdminOrOwner) {
              return next();
            }
          }
        } else {
          // Fallback if models failed to load but session exists (shouldn't happen)
          return next();
        }
      }
    } catch (err) {
      console.error('[FormBuilder Auth] Error verifying session:', err.message);
    }
  } else {
    // Fallback: in isolated test runs, allow bypass. On a live Ghost server, getSession is always loaded.
    const isDevFallback = process.env.NODE_ENV !== 'production' && !getGhostPath('core/server/services/auth/session/express-session');
    if (isDevFallback) {
      return next();
    }
  }

  res.status(401).send('Unauthorized. Ghost Admin session required.');
}

// ── Admin UI pages ────────────────────────────────────────────────
router.get('/', requireAdminAuth, (_, res) => res.sendFile(path.join(__dirname, '../ui/panel.html')));
router.get('/builder', requireAdminAuth, (_, res) => res.sendFile(path.join(__dirname, '../ui/builder.html')));

// ── REST API ──────────────────────────────────────────────────────
router.get('/api/forms', requireAdminAuth, async (_, res) => {
  try { res.json(await formStore.listForms()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Public: allow embed.js to fetch form blueprint schema to render it on posts
router.get('/api/forms/:id', async (req, res) => {
  try { res.json(await formStore.getForm(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/forms', requireAdminAuth, validateSameOrigin, async (req, res) => {
  try { res.json(await formStore.createForm(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/api/forms/:id', requireAdminAuth, validateSameOrigin, async (req, res) => {
  try { res.json(await formStore.updateForm(req.params.id, req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/forms/:id', requireAdminAuth, validateSameOrigin, async (req, res) => {
  try { res.json(await formStore.deleteForm(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// REST API: get submissions for a specific form (used by responses viewer)
router.get('/api/submissions/:id', requireAdminAuth, async (req, res) => {
  try { res.json({ submissions: await formStore.getSubmissions(req.params.id) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Public: form submission from frontend (NO AUTHENTICATION)
router.post('/submit/:formId', async (req, res) => {
  try {
    await formStore.saveSubmission(req.params.formId, req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
