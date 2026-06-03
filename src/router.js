const express   = require('express');
const path      = require('path');
const router    = express.Router();
const formStore = require('./formStorage');

router.use(express.json());

// ── Admin UI pages ────────────────────────────────────────────────
router.get('/',          (_, res) => res.sendFile(path.join(__dirname, '../ui/panel.html')));
router.get('/builder',   (_, res) => res.sendFile(path.join(__dirname, '../ui/builder.html')));

// ── REST API ──────────────────────────────────────────────────────
router.get('/api/forms',           async (_, res) => {
  try { res.json(await formStore.listForms()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/forms/:id',       async (req, res) => {
  try { res.json(await formStore.getForm(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/forms',          async (req, res) => {
  try { res.json(await formStore.createForm(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/api/forms/:id',       async (req, res) => {
  try { res.json(await formStore.updateForm(req.params.id, req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/forms/:id',    async (req, res) => {
  try { res.json(await formStore.deleteForm(req.params.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// REST API: get submissions for a specific form (used by responses viewer)
router.get('/api/submissions/:id', async (req, res) => {
  try { res.json({ submissions: await formStore.getSubmissions(req.params.id) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Public: form submission from frontend
router.post('/submit/:formId',     async (req, res) => {
  try {
    await formStore.saveSubmission(req.params.formId, req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
