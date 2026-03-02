# Test Master Panel Analysis & Improvement Report

## 1. Overview
The Test Master panel currently consists of two main complex components:
- **[TestMaster.tsx](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestMaster.tsx)**: The primary interface for viewing and managing tests, their parameters, and reference ranges. It features a 3-column layout (Tests, Parameters, Reference Ranges) and includes bulk Excel import functionality.
- **[TestWizard.tsx](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestWizard.tsx)**: A 6-step wizard for creating or editing test definitions through a draft system ([Basics](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestWizard.tsx#244-289) -> [Parameters](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestMaster.tsx#81-89) -> `Ref Ranges` -> `Critical Values` -> [Layout](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestWizard.tsx#148-155) -> [Review](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestWizard.tsx#473-511)).

While functional, both components have grown quite large and exhibit several UX, functionality, and architectural limitations that can be improved to enhance stability and user experience.

---

## 2. Key Findings & Areas for Improvement

### A. User Experience (UX) & Interface
1. **Age Input in Days (High Priority):** 
   - *Issue*: Age ranges for reference ranges and critical values are currently inputted purely in **days** (e.g., entering `36500` for 100 years). This requires users to do mental math (years/months to days) and is highly error-prone.
   - *Suggestion*: Create a dedicated `AgeInput` component that allows users to input age using dropdowns/fields for "Years", "Months", and "Days", while automatically calculating the total days for the backend.

2. **Reference Range Editing (High Priority):**
   - *Issue*: In both [TestMaster.tsx](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestMaster.tsx) and [TestWizard.tsx](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestWizard.tsx), reference ranges can only be **added** or **deleted**. There is no "Edit" button for an existing reference range.
   - *Suggestion*: Implement an inline edit mode for existing reference ranges so users don't have to delete and recreate a range just to fix a typo.

3. **Complex Navigation / Clicks:**
   - *Issue*: The 3-column layout in [TestMaster](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestMaster.tsx#35-621) requires precise clicking. To edit a parameter, you must select the Test -> select the Parameter -> click the tiny Edit icon.
   - *Suggestion*: Allow clicking a row in the test or parameter list to more prominently show its actions (or use double-click). Currently, they have small icons on the far right.

4. **Lack of Pagination/Virtualization:**
   - *Issue*: The tests list renders all items at once. If a lab has thousands of tests, the `<ul>` element might become slow.
   - *Suggestion*: Implement virtualization (e.g., `react-window`) or simple pagination for the test list.

### B. Functionality & Logic Gaps
1. **Handling of `CALCULATED` Parameters:**
   - *Issue*: The system allows selecting `CALCULATED` as a data type, but there is no UI in [TestMaster](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestMaster.tsx#35-621) or [TestWizard](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestWizard.tsx#23-563) to actually define the mathematical calculation formula (e.g., `A/G Ratio = Albumin / Globulin`). There is a `formula` field in [addParam](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestWizard.tsx#193-200) code but no input field for "formula".
   - *Suggestion*: Add a "Formula String" input field that appears conditionally when `data_type === 'CALCULATED'` is selected.

2. **Handling of `TEXT` Parameters:**
   - *Issue*: `TEXT` data types are selectable, but the reference range UI still only asks for `Lower Limit` and `Upper Limit` (numeric). 
   - *Suggestion*: For `TEXT` parameters, the reference range UI should change to accept a "Default Value" or "Expected String" (e.g., "Non-Reactive", "Negative") instead of numeric limits.

3. **Critical Values Validation:**
   - *Issue*: Critical ranges are defined in step 4 of the wizard but are not visually checked against standard reference ranges.
   - *Suggestion*: Add a UI warning if a configured "Critical Low" is heavily overlapping or higher than the normal reference "Lower Limit".

### C. Architecture & Code Quality
1. **Component Monoliths:**
   - *Issue*: [TestMaster.tsx](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestMaster.tsx) is over 600 lines, and [TestWizard.tsx](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestWizard.tsx) is nearly 600 lines. They mix API calls (`window.electronAPI`), complex UI state, and business logic (like Excel parsing).
   - *Suggestion*: Split these into smaller, modular components:
     - `TestListPanel.tsx`, `ParameterListPanel.tsx`, `ReferenceRangePanel.tsx`
     - Extract the Excel Import logic into a helper utility (`importExcel.ts`) and abstract the Import Modal into `BulkImportModal.tsx`.

2. **Native Confirm Dialogs:**
   - *Issue*: The app uses native `confirm('Are you sure...')` dialogs for deletion. This breaks the modern electron app immersion.
   - *Suggestion*: Replace native `confirm()` with a custom React modal or a `useConfirm` dialog hook.

---

## 3. Recommended Action Plan

Here is a proposed sequence for implementing these improvements:

**Phase 1: Quick UX Wins & Bug Fixes**
- [ ] Build an `AgeInput` component (Year/Month/Day to days converter) and integrate it into [TestMaster](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestMaster.tsx#35-621) and [TestWizard](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestWizard.tsx#23-563).
- [ ] Add the "Edit" capability for Reference Ranges.
- [ ] Make the `CALCULATED` formula field visible.

**Phase 2: Complex Parameter Enhancements**
- [ ] Implement conditional UI for `TEXT` parameters (expected text vs numeric limits).
- [ ] Replace native `confirm()` alerts with custom dialogs for test/parameter deletion.

**Phase 3: Refactoring (Tech Debt)**
- [ ] Refactor [TestMaster.tsx](file:///d:/work/patho-lab/patho-lab-app/src/pages/TestMaster/TestMaster.tsx) into smaller sub-components (Left, Middle, Right panels).
- [ ] Extract Excel Import logic.

Please let me know which of these improvements you would like me to begin implementing, or if you'd like to refine the scope!
