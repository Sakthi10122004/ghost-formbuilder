# Ghost FormBuilder Premium

A premium, non-destructive, zero-configuration drag-and-drop form builder companion plugin for **Ghost CMS** that injects a gorgeous admin workspace dashboard and dynamic database log grid directly into your Ghost Admin console.

---

## Features

- **Zero-Touch Configuration**: Automatically plugs into your existing Ghost database (SQLite/MySQL) using Ghost's live connection. Zero configuration or manual table additions needed!
- **React-Admin Native UI**: Hooks cleanly into Ghost's new React-based admin navigation sidebar via an elegant, non-destructive `MutationObserver` injector.
- **Three-Screen Dashboard**: Manage form blueprints, copy HTML embedding snippets, delete forms, and explore **live, interactive response log payloads** inside a frosted-glass overlay.
- **High-Performance Drag-and-Drop**: Build sleek forms dynamically with text fields, phone numbers, email controls, checkboxes, dropdowns, and textareas.
- **Responsive Embed Engine**: Auto-renders beautiful, responsive form controls with sleek focus/hover interactions on your public-facing site.

---

## Quick Start

### 1. Installation
Step into your Ghost installation root directory and run the standard install pointing to this package:

```bash
npm install "/path/to/ghost-formbuilder"
```

Our strict **environment guard** will validate your Ghost ecosystem, and automatically inject the scheduling hijack config `"scheduling": { "active": "ghost-formbuilder" }` into your configuration.

### 2. Restart Ghost
Apply the integration by restarting your Ghost instance:

```bash
ghost restart
```

### 3. Uninstall
If your local NPM blocks lifecycle scripts (e.g., `allow-scripts` warnings), run the teardown script manually before uninstalling to ensure your Ghost configuration is cleaned properly:
```bash
node "node_modules/ghost-formbuilder/scripts/uninstall.js"
npm uninstall ghost-formbuilder
```
*(The teardown script automatically triggers a local ghost restart).*

### 3. Open Forms Console
Navigate to your Ghost Admin panel (`http://localhost:2368/ghost/`). You will see a new **Forms** tab right above **Settings**.
Clicking it will slide open the beautiful glassmorphic control center.

---

##  Embedding Forms on your Site

To display a form on any of your Ghost posts or pages:
1. In the **Forms Console**, click **Copy Code** on your desired form to copy its custom embed handle (e.g. `<div data-form-id="abcdef123"></div>`).
2. Add a new **HTML block** in the Ghost Editor where you want the form to appear.
3. Paste the code block and save the post.
4. Add the frontend rendering script `ui/embed.js` to your Ghost site. The easiest way is to add this single line inside your Ghost **Code Injection** (Footer):
   ```html
   <script src="/form-builder/ui/embed.js" defer></script>
   ```

Now, your form will render beautifully on the live site, and all submissions will be logged instantly in your Admin Console!
