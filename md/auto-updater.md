# PathoDesk Auto-Updater Guide

PathoDesk uses **electron-updater** with **GitHub Releases** to deliver automatic updates to users.

---

## How It Works

1. When the app launches (production only), it calls `autoUpdater.checkForUpdatesAndNotify()`
2. The updater checks the GitHub repo (`devshayan101/PathoDesk`) for newer releases
3. If a newer version exists, it downloads the update automatically in the background
4. Once downloaded, a dialog prompts the user: **"Restart Now"** or **"Later"**
5. On restart, the new version is installed automatically

---

## Setup: GitHub Personal Access Token (PAT)

A **GitHub Personal Access Token** is required to **publish** releases from your machine. Users downloading updates do **not** need a token (the repo must be **public**, or you need `private: true` in `electron-builder.json5`).

### Step 1: Create a GitHub PAT

1. Go to: [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token"** → Choose **"Fine-grained token"** (recommended) or **"Classic"**
3. For **Classic tokens**:
   - Set a name (e.g., `PathoDesk-Release`)
   - Set an expiration (e.g., 90 days)
   - Select scope: **`repo`** (full repo access — needed to create releases and upload assets)
4. For **Fine-grained tokens**:
   - Select the `devshayan101/PathoDesk` repository
   - Under **Permissions → Repository permissions**, set:
     - **Contents**: Read and Write
     - **Metadata**: Read-only
5. Click **"Generate token"**
6. **Copy the token immediately** — you won't see it again!

### Step 2: Set the `GH_TOKEN` Environment Variable

#### Option A: Temporary (current terminal session only)

**PowerShell:**
```powershell
$env:GH_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxx"
```

**Command Prompt:**
```cmd
set GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

#### Option B: Permanent (recommended for dev machines)

**Via Windows Settings:**
1. Press `Win + S` → Search **"Environment Variables"**
2. Click **"Edit the system environment variables"**
3. Click **"Environment Variables..."** button
4. Under **User variables**, click **"New"**
5. Variable name: `GH_TOKEN`
6. Variable value: `ghp_xxxxxxxxxxxxxxxxxxxx` (paste your token)
7. Click OK → OK → OK
8. **Restart your terminal/IDE** for the change to take effect

---

## Publishing an Update

### Step 1: Bump the Version

Edit `package.json` and increment the version:
```json
{
  "version": "1.2.0"
}
```

Follow [Semantic Versioning](https://semver.org/):
- **Patch** (1.0.0 → 1.0.1): Bug fixes only
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes

### Step 2: Build and Publish

```powershell
cd d:\work\patho-lab\patho-lab-app
npx electron-builder --publish always
```

This will:
1. Build the Vite frontend (`dist/`)
2. Build the Electron main process (`dist-electron/`)
3. Package the app into an NSIS installer (Windows)
4. Create a GitHub Release with the version tag
5. Upload the installer `.exe` and `latest.yml` to the release

### Step 3: Verify

1. Go to [https://github.com/devshayan101/PathoDesk/releases](https://github.com/devshayan101/PathoDesk/releases)
2. Confirm the new release is listed with the correct version
3. Confirm the following files are attached:
   - `PathoDesk-Windows-X.Y.Z-Setup.exe`
   - `latest.yml`

---

## Configuration Reference

### `electron-builder.json5` (publish section)
```json5
"publish": [{
  "provider": "github",
  "owner": "devshayan101",
  "repo": "PathoDesk"
}]
```

### `electron/main.ts` (auto-updater section)
```typescript
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.checkForUpdatesAndNotify()
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `GH_TOKEN` not recognized | Restart your terminal after setting the env variable |
| `401 Unauthorized` when publishing | Token expired — regenerate a new PAT |
| `403 Forbidden` | Token doesn't have `repo` scope — recreate with correct permissions |
| Update not detected by app | Ensure the new version in `package.json` is **higher** than the installed version |
| `latest.yml` not found | The publish step failed — re-run `npx electron-builder --publish always` |
| Users on old version not updating | The repo must be public, or add `"private": true` in publish config and provide a token at runtime |

---

## Security Notes

- **Never commit your `GH_TOKEN`** to the repository
- Add `GH_TOKEN` to `.gitignore` and `.env` files
- For CI/CD pipelines (GitHub Actions), store the token as a **repository secret**
- Rotate tokens periodically (every 90 days recommended)
