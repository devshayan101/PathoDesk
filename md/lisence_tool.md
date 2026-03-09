📜 License Generator CLI Tool
The 
generate-license.ts
 script is a vendor-side tool for creating signed license files.

WARNING

This script should NOT be distributed with the application. Keep the private key secure and never share it.

Prerequisites
cd patho-lab-app
npm install @types/node ts-node typescript --save-dev
Step 1: Generate Key Pair (First Time Only)
npx ts-node scripts/generate-license.ts keygen
Output:

🔐 Generating RSA 2048-bit key pair...
✅ Key pair generated successfully!
📁 Private key: scripts/.license-keys/private.pem
📁 Public key:  scripts/.license-keys/public.pem
⚠️  IMPORTANT:
   - Keep the private key SECURE and never distribute it.
   - The public key should be embedded in the application.
📋 Copy this public key to licenseService.ts:
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----
After generating, copy the public key and replace the PUBLIC_KEY constant in 
licenseService.ts
.

Step 2: Create a License (Interactive)
npx tsx scripts/generate-license.ts create
Example Session:

📝 Create New License
Lab Name: ABC Diagnostics
Issued To (contact name): Dr. John Smith
Edition Options: TRIAL, ANNUAL, PERPETUAL, ENTERPRISE
Edition [ANNUAL]: ANNUAL
Binding Mode Options:
  NONE   - No machine binding (for TRIAL)
  SOFT   - Tolerant binding (for ANNUAL)
  STRICT - Exact match required (for PERPETUAL)
Binding Mode [SOFT]: SOFT
Machine ID Hash (from customer): a1b2c3d4e5f6...
Max Users [5]: 5
Available Modules: BILLING, QC_AUDIT, ANALYZER, INVENTORY, DOCTOR_COMMISSION
Enter comma-separated list, or "ALL" for all modules.
Enabled Modules [BILLING]: BILLING, QC_AUDIT
Validity Period in days [365]: 365
Grace Period in days [14]: 14
📋 License Preview:
{
  "license_id": "LIC-ABCD-EFGH-IJKL-MNOP",
  "lab_name": "ABC Diagnostics",
  "issued_to": "Dr. John Smith",
  "machine_id_hash": "a1b2c3d4e5f6...",
  "edition": "ANNUAL",
  "binding_mode": "SOFT",
  "enabled_modules": ["BILLING", "QC_AUDIT"],
  "max_users": 5,
  "issue_date": "2026-01-27",
  "expiry_date": "2027-01-27",
  "grace_period_days": 14
}
Generate license? (yes/no): yes
✅ License generated successfully!
📁 File: license_ABC_Diagnostics_2026-01-27.lic
🔑 License ID: LIC-ABCD-EFGH-IJKL-MNOP
📅 Valid until: 2027-01-27
📦 Modules: BILLING, QC_AUDIT
Step 3: Create License from Config File
For bulk license creation, use a JSON config file:

license-config.json:

{
  "lab_name": "XYZ Pathology",
  "issued_to": "Dr. Sarah Wilson",
  "machine_id_hash": "abcdef123456...",
  "edition": "ENTERPRISE",
  "binding_mode": "STRICT",
  "enabled_modules": ["BILLING", "QC_AUDIT", "ANALYZER", "DOCTOR_COMMISSION"],
  "max_users": 10,
  "expiry_date": "2028-01-01",
  "grace_period_days": 14
}
npx ts-node scripts/generate-license.ts create --config license-config.json
Getting Customer's Machine ID
Customers can find their Machine ID in:

License Settings page - Admin → License
The Machine ID is displayed in the "Machine Identifier" section
They can click "Copy" to copy it to clipboard
License File Structure
The generated .lic file is a JSON file with this structure:

{
  "data": {
    "license_id": "LIC-XXXX-YYYY-ZZZZ-AAAA",
    "lab_name": "ABC Diagnostics",
    "issued_to": "Dr. John Smith",
    "machine_id_hash": "sha256-hash-of-machine-id",
    "edition": "ANNUAL",
    "binding_mode": "SOFT",
    "enabled_modules": ["BILLING", "QC_AUDIT"],
    "max_users": 5,
    "issue_date": "2026-01-27",
    "expiry_date": "2027-01-27",
    "grace_period_days": 14
  },
  "signature": "base64-encoded-rsa-sha256-signature"
}