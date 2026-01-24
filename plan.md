# Offline Pathology Lab Software - Implementation Plan
## Electron + TypeScript + React + SQLite

---

## Executive Summary

Build a **fully offline, clinically safe, licensed pathology lab software** for Windows desktop. The application follows a single-PC deployment model using Electron with TypeScript, React UI, and encrypted SQLite database.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron |
| Language | TypeScript (strict mode) |
| Frontend | React 18 + React Router |
| State Management | Zustand |
| Styling | CSS Modules + Custom Design System |
| Database | better-sqlite3 (encrypted) |
| PDF Generation | @react-pdf/renderer |
| Build/Package | Electron Forge |

---

## Project Structure

```
patho-lab/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts
│   │   ├── ipc/                 # IPC handlers
│   │   ├── database/
│   │   └── services/
│   ├── renderer/                # React UI
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── styles/
│   ├── shared/                  # Shared types & constants
│   └── preload/
├── assets/
├── forge.config.ts
├── package.json
└── tsconfig.json
```

---

## Phased Implementation

### Phase 1: Project Foundation ✅ COMPLETED
**Duration: ~3-4 hours**

- [x] Initialize Electron + Vite + React + TypeScript project
- [x] Configure TypeScript, project structure
- [x] Create design system (CSS variables, dark theme, components)
- [x] Build layout matching wireframe Application Shell (horizontal nav)
- [x] Create all UI pages matching wireframes:
  - [x] Login page
  - [x] Dashboard with stats and pending tables
  - [x] Patient Registration with form modal
  - [x] Order Creation with test selection and billing
  - [x] Sample Accession with barcode actions
  - [x] Result Entry (3-panel clinical layout with flags)
  - [x] Test Master Configuration with reference ranges
- [x] Implement routing with React Router
- [x] Create Zustand auth store with mock login

---

### Phase 2: Authentication & Licensing
**Duration: ~4-5 hours**

- [ ] User login with bcrypt password verification
- [ ] Session management (in-memory)
- [ ] Role-based permission checking
- [ ] License file loading & parsing
- [ ] RSA/ECDSA signature verification
- [ ] Login page UI

---

### Phase 3: Core Layout & Navigation
**Duration: ~3-4 hours**

- [ ] Sidebar navigation with role-based visibility
- [ ] Header with user info, license status
- [ ] Main layout shell
- [ ] Design system (colors, typography, spacing)

---

### Phase 4: Patient & Order Management
**Duration: ~6-8 hours**

- [ ] Patient list with search
- [ ] Patient registration form
- [ ] Order creation with test selection
- [ ] Sample accession & barcode printing

---

### Phase 5: Test Master Configuration
**Duration: ~5-6 hours**

- [ ] Test definition CRUD
- [ ] Parameter configuration
- [ ] Reference range editor (age/gender-based)
- [ ] Critical value management

---

### Phase 6: Result Entry (Clinical Core)
**Duration: ~8-10 hours**

- [ ] 3-panel result entry layout
- [ ] Parameter grid with validation
- [ ] Abnormal flagging (H/L/Critical)
- [ ] Delta check implementation
- [ ] Verification workflow

---

### Phase 7: Report Generation
**Duration: ~5-6 hours**

- [ ] PDF report template
- [ ] Report preview
- [ ] Digital signature integration
- [ ] Print functionality

---

### Phase 8: Billing & Inventory
**Duration: ~6-7 hours**

- [ ] Invoice creation
- [ ] Payment tracking
- [ ] Stock management
- [ ] Reagent expiry alerts

---

### Phase 9: QC & Audit
**Duration: ~4-5 hours**

- [ ] Daily QC entry
- [ ] Audit trail logging
- [ ] Audit report generation

---

### Phase 10: Polish & Deployment
**Duration: ~4-5 hours**

- [ ] Error boundaries
- [ ] Crash recovery
- [ ] Windows installer (NSIS)
- [ ] Documentation

---

## Verification Plan

### Manual Testing
1. License validation (Trial/Valid/Expired modes)
2. Authentication flow with role-based access
3. Patient & Order workflow
4. Result Entry with validation
5. Report generation & printing

### Automated Testing
```bash
npm test                  # Unit tests
npm run test:integration  # Integration tests
```

---

**Estimated Total Development Time: 50-60 hours**
