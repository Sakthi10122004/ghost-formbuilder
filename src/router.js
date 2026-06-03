const express   = require('express');
const path      = require('path');
const router    = express.Router();
const formStore = require('./formStorage');
const { getGhostPath } = require('./utils');

router.use(express.json());

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

// Authentication middleware to restrict route access to administrators
async function requireAdminAuth(req, res, next) {
  if (!getSession) {
    // Fallback: in isolated test runs, allow bypass. On a live Ghost server, getSession is always loaded.
    const isDevFallback = process.env.NODE_ENV !== 'production' && !getGhostPath('core/server/services/auth/session/express-session');
    if (isDevFallback) {
      return next();
    }
    return res.status(500).send('Authentication service not available.');
  }

  try {
    const sessionObj = await getSession(req, res);
    if (sessionObj && sessionObj.user_id) {
      return next();
    }
  } catch (err) {
    console.error('[FormBuilder Auth] Error verifying session:', err.message);
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

router.get('/api/forms/:id', requireAdminAuth, async (req, res) => {
  try { res.json(await formStore.getForm(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/forms', requireAdminAuth, async (req, res) => {
  try { res.json(await formStore.createForm(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/api/forms/:id', requireAdminAuth, async (req, res) => {
  try { res.json(await formStore.updateForm(req.params.id, req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/forms/:id', requireAdminAuth, async (req, res) => {
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
