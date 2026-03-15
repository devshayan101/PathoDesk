# PathoDesk Auto-Backup: Cloud Storage Design

## Problem Statement

PathoDesk stores all lab data in a local SQLite database. If the machine crashes (disk failure, ransomware, theft), **all patient data, test results, and reports are permanently lost**. Labs need a simple, reliable, and cost-effective cloud backup solution.

### Requirements

| Requirement | Priority |
|---|---|
| Zero or minimal cost | Critical |
| Automatic scheduled backups | Critical |
| Encrypted before upload (patient data is sensitive) | Critical |
| Works offline (queues backup on reconnect) | High |
| Simple setup (non-technical lab staff) | High |
| Restore capability | High |
| Minimal codebase changes | Medium |

---

## Design Iteration 1: GitHub Private Repository

### Architecture

```
PathoDesk App
  │
  ├─ Schedule: Every 6 hours (or on-demand)
  │    1. Copy SQLite DB → temp file
  │    2. Encrypt with AES-256 (key derived from lab-specific passphrase)
  │    3. Compress with gzip
  │    4. Git commit + push to private GitHub repo
  │
  └─ Restore:
       1. Git clone/pull from repo
       2. Decompress + decrypt
       3. Replace local DB
```

### Implementation

- Use `simple-git` (npm package) to manage a local Git repo in the app data directory
- The backup file is `patho_backup_YYYY-MM-DD_HHmm.db.enc`
- Use `crypto` (Node.js built-in) for AES-256-GCM encryption
- GitHub PAT stored in app settings (same as auto-updater)

### Pros
- **Free**: GitHub private repos are free (unlimited repos, unlimited collaborators)
- **Version history**: Git naturally provides full backup history
- **Familiar**: Developer already has GitHub account + PAT
- **Simple restore**: Clone repo → decrypt → done

### Cons
- **Size limit**: GitHub repos have a soft limit of ~1GB, files up to 100MB per push
- **Not designed for binary blobs**: Git's diff algorithm is inefficient for binary files
- **Requires Git**: Must bundle `simple-git` or shell out to system git
- **PAT management**: Token must be refreshed periodically

### Cost: **$0/month**

---

## Design Iteration 2: Google Drive (Service Account / OAuth)

### Architecture

```
PathoDesk App
  │
  ├─ Schedule: Every 6 hours (or on-demand)
  │    1. Copy SQLite DB → temp file
  │    2. Encrypt with AES-256
  │    3. Compress with gzip
  │    4. Upload to Google Drive via REST API
  │    5. Keep last N backups, delete older ones
  │
  └─ Restore:
       1. List backups from Google Drive
       2. Download selected backup
       3. Decompress + decrypt
       4. Replace local DB
```

### Implementation

- Use `googleapis` npm package (official Google API client)
- **OAuth2 flow**: User signs in with their Google account via a browser popup
- Store refresh token locally (encrypted)
- Upload to a dedicated `PathoDesk-Backups` folder in user's Drive
- Retention policy: Keep last 30 backups, delete older

### Pros
- **Free**: 15GB free storage per Google account (SQLite DBs are typically <50MB)
- **No server needed**: Direct client-to-Google-Drive communication
- **User-friendly**: Sign in with Google — familiar to everyone
- **Large storage**: 15GB is more than enough for years of backups
- **Web UI**: User can browse backups at [drive.google.com](https://drive.google.com)

### Cons
- **OAuth complexity**: Need to register a Google Cloud project + OAuth consent screen
- **Token refresh**: Refresh tokens can expire if unused for 6 months
- **Google Cloud Console setup**: Must create project, enable Drive API, configure consent
- **Review process**: If >100 users, Google requires OAuth app verification

### Cost: **$0/month** (within 15GB free tier)

---

## Design Iteration 3: Cloudflare R2 (S3-compatible)

### Architecture

```
PathoDesk App
  │
  ├─ Schedule: Every 6 hours (or on-demand)
  │    1. Copy SQLite DB → temp file
  │    2. Encrypt with AES-256
  │    3. Compress with gzip
  │    4. Upload to R2 bucket via S3 API
  │    5. Lifecycle rule: auto-delete backups older than 90 days
  │
  └─ Restore:
       1. List objects in R2 bucket
       2. Download selected backup
       3. Decompress + decrypt
       4. Replace local DB
```

### Implementation

- Use `@aws-sdk/client-s3` npm package (R2 is S3-compatible)
- Create one R2 bucket per lab (or use key prefixes)
- Store R2 API token in app settings
- Upload with key: `backups/{lab_id}/{timestamp}.db.enc.gz`

### Pros
- **Free tier generous**: 10GB storage, 10M Class B requests/month, 1M Class A/month
- **No egress fees**: Unlike AWS S3, Cloudflare R2 has **zero egress fees**
- **S3-compatible**: Huge ecosystem of tools and libraries
- **Lifecycle rules**: Automatic cleanup of old backups
- **Professional**: Enterprise-grade object storage

### Cons
- **Requires Cloudflare account**: Lab admin must create account + generate API keys
- **More setup**: Create bucket, generate API tokens, configure in app
- **Shared credentials risk**: If app distributes a single API token, any user could access all backups (needs per-lab isolation)
- **Vendor dependency**: Cloudflare-specific, though S3-compatible is portable

### Cost: **$0/month** (within free tier: 10GB, 10M reads, 1M writes)

---

## Comparison Matrix

| Criteria | GitHub Repo | Google Drive | Cloudflare R2 |
|---|---|---|---|
| **Monthly Cost** | $0 | $0 | $0 |
| **Free Storage** | ~1GB (soft) | 15GB | 10GB |
| **Setup Complexity** | ⭐ Low (PAT only) | ⭐⭐⭐ High (OAuth + GCP) | ⭐⭐ Medium (API key) |
| **User Setup Effort** | Low (paste PAT) | Low (Google Sign-in) | Medium (create account) |
| **Backup History** | ✅ Full (git log) | ✅ Last N versions | ✅ Last N versions |
| **Offline Support** | ✅ Git queues commits | ⚠ Must queue manually | ⚠ Must queue manually |
| **Security** | ✅ Private repo + encryption | ✅ OAuth + encryption | ✅ API key + encryption |
| **Restore UX** | Medium (git pull) | Good (browse Drive) | Medium (list + download) |
| **Binary File Handling** | ⚠ Poor (git bloat) | ✅ Good | ✅ Good |
| **Scalability** | ⚠ Limited (~1GB) | ✅ Good (15GB) | ✅ Good (10GB) |
| **Maintenance** | Low | Medium (token refresh) | Low |
| **Dependencies** | `simple-git`, `crypto` | `googleapis`, `crypto` | `@aws-sdk/client-s3`, `crypto` |

---

## Recommendation: **Google Drive (Iteration 2)**

### Rationale

1. **Best UX for non-technical users**: "Sign in with Google" is universally familiar. No need to create GitHub accounts or Cloudflare accounts.
2. **Most storage**: 15GB free tier is the largest, supporting years of daily backups.
3. **Built-in web UI**: Lab owners can browse and download backups directly at [drive.google.com](https://drive.google.com) without needing the app.
4. **No binary bloat**: Unlike GitHub (git), Google Drive handles binary uploads natively.
5. **Zero cost**: Well within the free tier for this use case.

### Simplified Implementation Plan

The OAuth complexity can be mitigated by:
1. Pre-registering the Google Cloud project under the developer's account
2. Distributing the client ID/secret within the app binary (standard practice for desktop OAuth)
3. Users only need to click "Sign in with Google" — zero manual configuration

### For MVP (Minimum Viable Product)
If Google Drive OAuth setup is too much for the initial release, start with **GitHub (Iteration 1)** since the PAT infrastructure already exists for the auto-updater. Migrate to Google Drive in a future version.

---

## Implementation Steps (Google Drive - Recommended)

### Phase 1: Core Backup Engine
1. Create `electron/services/backupService.ts`
2. Implement SQLite DB copy → encrypt → compress pipeline
3. Add backup scheduling (every 6 hours via `setInterval`)

### Phase 2: Google Drive Integration
1. Register Google Cloud project + enable Drive API
2. Add `googleapis` dependency
3. Implement OAuth2 sign-in flow (browser popup)
4. Upload/download/list/delete operations

### Phase 3: UI
1. Add "Backup & Restore" section in Settings page
2. Show backup history (date, size, status)
3. "Backup Now" button for on-demand backup
4. "Restore" button with backup selection

### Phase 4: Polish
1. Backup status indicator in the app header (last backup time)
2. Notification if backup is >24 hours old
3. Error handling and retry logic
