const crypto = require('crypto');
const { getGhostPath } = require('./utils');
let db = null;

exports.init = async function() {
    try {
        const dbPath = getGhostPath('core/server/data/db/connection');
        if (!dbPath) {
            console.error('[FormBuilder DB] Could not locate core database module path.');
            return;
        }
        const databaseService = require(dbPath);
        db = databaseService;

        if (!db) {
            console.error('[FormBuilder DB] Could not resolve live database driver.');
            return;
        }

        await bootstrapTables();
    } catch (err) {
        console.error('[FormBuilder DB] Initialization error:', err);
    }
};

async function bootstrapTables() {
    const hasFormsTable = await db.schema.hasTable('fb_forms');
    if (!hasFormsTable) {
        await db.schema.createTable('fb_forms', (table) => {
            table.string('id').primary();
            table.string('title').notNullable();
            table.text('schema').notNullable();
            table.dateTime('created_at').defaultTo(db.fn.now());
            table.dateTime('updated_at').defaultTo(db.fn.now());
        });
        console.log('[FormBuilder DB] Created "fb_forms" table.');
    }

    const hasSubmissionsTable = await db.schema.hasTable('fb_submissions');
    if (!hasSubmissionsTable) {
        await db.schema.createTable('fb_submissions', (table) => {
            table.increments('id').primary();
            table.string('form_id').references('id').inTable('fb_forms').onDelete('CASCADE');
            table.text('data').notNullable();
            table.dateTime('created_at').defaultTo(db.fn.now());
        });
        console.log('[FormBuilder DB] Created "fb_submissions" table.');
    }
}

exports.listForms = async () => {
    const rows = await db('fb_forms').select('*');
    return rows.map(rowToForm);
};

exports.getForm = async (id) => {
    const row = await db('fb_forms').where({ id }).first();
    return rowToForm(row);
};

exports.createForm = async (formDef) => {
    const id = crypto.randomBytes(8).toString('hex');
    const title = formDef.name || 'Untitled Form';
    const schema = JSON.stringify({
        fields: formDef.fields || [],
        customCss: formDef.customCss || '',
        layout: formDef.layout || 'default'
    });
    
    await db('fb_forms').insert({
        id,
        title,
        schema,
        created_at: new Date(),
        updated_at: new Date()
    });

    return exports.getForm(id);
};

exports.updateForm = async (id, formDef) => {
    const title = formDef.name;
    const schema = JSON.stringify({
        fields: formDef.fields || [],
        customCss: formDef.customCss || '',
        layout: formDef.layout || 'default'
    });

    await db('fb_forms').where({ id }).update({
        title,
        schema,
        updated_at: new Date()
    });

    return exports.getForm(id);
};

exports.deleteForm = async (id) => {
    await db('fb_forms').where({ id }).del();
    return { deleted: true };
};

exports.saveSubmission = async (formId, fields) => {
    await db('fb_submissions').insert({
        form_id: formId,
        data: JSON.stringify(fields)
    });
    return { success: true };
};

exports.getSubmissions = async (formId) => {
    const rows = await db('fb_submissions').where({ form_id: formId }).orderBy('created_at', 'desc');
    return rows.map(r => ({
        id: r.id,
        data: JSON.parse(r.data),
        createdAt: r.created_at
    }));
};

function rowToForm(row) {
    if (!row) return null;
    let fields = [];
    let customCss = '';
    let layout = 'default';
    try {
        let parsed = JSON.parse(row.schema || '[]');
        if (Array.isArray(parsed)) {
            fields = parsed;
        } else {
            fields = parsed.fields || [];
            customCss = parsed.customCss || '';
            layout = parsed.layout || 'default';
        }
    } catch (e) {}
    return {
        id: row.id,
        name: row.title,
        fields,
        customCss,
        layout,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
