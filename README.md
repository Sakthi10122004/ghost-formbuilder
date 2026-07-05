# Ghost FormBuilder Plugin

**Ghost FormBuilder** is a powerful, enterprise-ready side-car plugin for Ghost CMS that elegantly injects a fully visual, drag-and-drop form builder directly into the native Ghost Admin panel—without ever altering a single line of Ghost's core source code.

This plugin is architected for **Zero-Compromise Security**, meaning it is fully compliant with strict Kubernetes Pod Security Standards (PSS), stateless deployments, and containerized lifecycle management.

---

## Architecture & Security Highlights

- **Zero Security Regressions**: Operates strictly within Ghost's native security perimeter. No core files are touched. Includes Same-Origin policy validations and native Role-Based Access Control (RBAC) preventing unauthorized privilege escalations.
- **Strict Root-Hardening Compliance**: Fully supports `readOnlyRootFilesystem: true` operations.
- **Dropped Capabilities**: Runs perfectly in restricted Kubernetes environments with `runAsNonRoot: true` (UID 1000) and `capabilities: drop: ["ALL"]`. No elevated privileges required.
- **Automated Zero-Downtime Hot-Reloads**: Eliminates manual `ghost restart` operations in Docker/Kubernetes by utilizing a secure file-system watcher (Supervisor Pattern).
- **Idempotent Teardowns**: Safe and robust uninstallation. Automatically hands over routing adapters to other installed plugins or cleanly wipes configurations without crashing Ghost on reboot.
- **Multi-Plugin Coexistence**: Dynamically negotiates the `scheduling.active` boot sequence, allowing it to seamlessly coexist with other extensions (like Ghost MailConfig).

---

## 🚀 Deployment & Installation

### 1. Local / Bare-Metal Environments (Ghost-CLI)
If you are running Ghost locally or on a standard VM using the Ghost-CLI:

**Install:**
```bash
# Run this inside your Ghost root directory
npm install ghost-formbuilder
```
*Note: The automated installer will detect your `.ghost-cli` environment and automatically run `ghost restart` in the background for you!*

**Uninstall:**
If your local NPM blocks lifecycle scripts (e.g., `allow-scripts` warnings), run the teardown script manually before uninstalling:
```bash
node "node_modules/ghost-formbuilder/scripts/uninstall.js"
npm uninstall ghost-formbuilder
```
*(The teardown script automatically triggers a local ghost restart. Note: Custom database tables are preserved during uninstall to prevent data loss).*

### 2. Standard Docker Containers
To support zero-downtime hot-reloads inside Docker without killing the container, you must use the **Supervisor Pattern**.

**Custom Dockerfile:**
```dockerfile
FROM ghost:5-alpine
WORKDIR /var/lib/ghost

# Copy the supervisor script (see documentation for script contents)
COPY ghost-supervisor.js /var/lib/ghost/ghost-supervisor.js

# Pre-install the plugin
RUN npm install ghost-formbuilder

USER node
# Override default CMD to use the Supervisor
CMD ["node", "ghost-supervisor.js"]
```
*When you install or uninstall the plugin dynamically inside a running container via `npm`, it will safely touch the `.reload-trigger` file, and the Supervisor will execute a zero-downtime micro-restart.*

### 3. Highly Restricted Kubernetes / Helm (Production)
For enterprise clusters enforcing `readOnlyRootFilesystem: true`, ensure your `config.production.json` is symlinked to your persistent volume using an `initContainer`.

**Example Helm Security Context:**
```yaml
securityContext:
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  runAsUser: 1000
  runAsGroup: 1000
  runAsNonRoot: true
  capabilities:
    drop: ["ALL"]
```

---

## Usage

1. Open your Ghost Admin interface.
2. Open your **Settings** sidebar.
3. Click the newly injected **Installed Plugins** option near the bottom of the navigation pane.
4. Select the Form Builder plugin and hit **Configure**.
5. Use the visual editor to construct dynamic forms, and easily inject them into your Ghost posts via custom HTML or Markdown cards!
