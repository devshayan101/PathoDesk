#!/usr/bin/env node
/**
 * License Generator CLI Tool
 * 
 * This tool is for the VENDOR to generate license files for customers.
 * It should NOT be distributed with the application.
 * 
 * Usage:
 *   npx tsx generate-license.ts --help
 *   npx tsx generate-license.ts keygen              # Generate new key pair (first time)
 *   npx tsx generate-license.ts create              # Create a new license (interactive)
 *   npx tsx generate-license.ts create --config license.json  # Create from config file
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// License types
type LicenseType = 'TRIAL' | 'ANNUAL' | 'PERPETUAL' | 'ENTERPRISE';
type BindingMode = 'NONE' | 'SOFT' | 'STRICT';
type LicenseModule = 'BILLING' | 'QC_AUDIT' | 'ANALYZER' | 'INVENTORY' | 'DOCTOR_COMMISSION';

interface LicenseData {
    license_id: string;
    lab_name: string;
    issued_to: string;
    machine_id_hash: string | null;
    edition: LicenseType;
    binding_mode: BindingMode;
    enabled_modules: LicenseModule[];
    max_users: number;
    issue_date: string;
    expiry_date: string;
    grace_period_days: number;
}

interface SignedLicense {
    data: LicenseData;
    signature: string;
}

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_DIR = path.join(__dirname, '.license-keys');
const PRIVATE_KEY_FILE = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_FILE = path.join(KEYS_DIR, 'public.pem');

// Helper to ask questions
function ask(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

// Generate new RSA key pair
async function generateKeyPair(): Promise<void> {
    console.log('\n🔐 Generating RSA 2048-bit key pair...\n');

    // Create keys directory if it doesn't exist
    if (!fs.existsSync(KEYS_DIR)) {
        fs.mkdirSync(KEYS_DIR, { recursive: true });
    }

    // Check if keys already exist
    if (fs.existsSync(PRIVATE_KEY_FILE)) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const overwrite = await ask(rl, '⚠️  Keys already exist. Overwrite? (yes/no): ');
        rl.close();

        if (overwrite.toLowerCase() !== 'yes') {
            console.log('❌ Aborted.');
            return;
        }
    }

    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    fs.writeFileSync(PRIVATE_KEY_FILE, privateKey);
    fs.writeFileSync(PUBLIC_KEY_FILE, publicKey);

    console.log('✅ Key pair generated successfully!\n');
    console.log(`📁 Private key: ${PRIVATE_KEY_FILE}`);
    console.log(`📁 Public key:  ${PUBLIC_KEY_FILE}`);
    console.log('\n⚠️  IMPORTANT:');
    console.log('   - Keep the private key SECURE and never distribute it.');
    console.log('   - The public key should be embedded in the application.');
    console.log('\n📋 Copy this public key to licenseService.ts:\n');
    console.log(publicKey);
}

// Sign data and create license file
function signLicense(data: LicenseData, privateKeyPath: string): SignedLicense {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
    const dataJson = JSON.stringify(data);

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(dataJson);
    sign.end();

    const signature = sign.sign(privateKey, 'base64');

    return { data, signature };
}

// Generate unique license ID
function generateLicenseId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'LIC-';
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (i < 3) result += '-';
    }
    return result;
}

// Interactive license creation
async function createLicenseInteractive(): Promise<void> {
    console.log('\n📝 Create New License\n');

    // Check for private key
    if (!fs.existsSync(PRIVATE_KEY_FILE)) {
        console.log('❌ Private key not found. Run `keygen` first.');
        return;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        // Gather license information
        const labName = await ask(rl, 'Lab Name: ');
        const issuedTo = await ask(rl, 'Issued To (contact name): ');

        console.log('\nEdition Options: TRIAL, ANNUAL, PERPETUAL, ENTERPRISE');
        const edition = (await ask(rl, 'Edition [ANNUAL]: ')).toUpperCase() as LicenseType || 'ANNUAL';

        console.log('\nBinding Mode Options:');
        console.log('  NONE   - No machine binding (for TRIAL)');
        console.log('  SOFT   - Tolerant binding (for ANNUAL)');
        console.log('  STRICT - Exact match required (for PERPETUAL)');

        const defaultBinding = edition === 'TRIAL' ? 'NONE' : edition === 'PERPETUAL' ? 'STRICT' : 'SOFT';
        const bindingMode = (await ask(rl, `Binding Mode [${defaultBinding}]: `)).toUpperCase() as BindingMode || defaultBinding;

        let machineIdHash: string | null = null;
        if (bindingMode !== 'NONE') {
            machineIdHash = await ask(rl, 'Machine ID Hash (from customer): ');
            if (!machineIdHash) machineIdHash = null;
        }

        const maxUsersStr = await ask(rl, 'Max Users [5]: ');
        const maxUsers = parseInt(maxUsersStr) || 5;

        console.log('\nAvailable Modules: BILLING, QC_AUDIT, ANALYZER, INVENTORY, DOCTOR_COMMISSION');
        console.log('Enter comma-separated list, or "ALL" for all modules.');
        const modulesInput = await ask(rl, 'Enabled Modules [BILLING]: ');

        let enabledModules: LicenseModule[];
        if (modulesInput.toUpperCase() === 'ALL' || edition === 'ENTERPRISE') {
            enabledModules = ['BILLING', 'QC_AUDIT', 'ANALYZER', 'INVENTORY', 'DOCTOR_COMMISSION'];
        } else {
            enabledModules = modulesInput.split(',')
                .map(m => m.trim().toUpperCase() as LicenseModule)
                .filter(m => ['BILLING', 'QC_AUDIT', 'ANALYZER', 'INVENTORY', 'DOCTOR_COMMISSION'].includes(m));
            if (enabledModules.length === 0) {
                enabledModules = ['BILLING'];
            }
        }

        const defaultDays = edition === 'TRIAL' ? 30 : edition === 'PERPETUAL' ? 36500 : 365;
        const daysStr = await ask(rl, `Validity Period in days [${defaultDays}]: `);
        const days = parseInt(daysStr) || defaultDays;

        const gracePeriodStr = await ask(rl, 'Grace Period in days [14]: ');
        const gracePeriod = parseInt(gracePeriodStr) || 14;

        // Calculate dates
        const issueDate = new Date().toISOString().split('T')[0];
        const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Create license data
        const licenseData: LicenseData = {
            license_id: generateLicenseId(),
            lab_name: labName,
            issued_to: issuedTo,
            machine_id_hash: machineIdHash,
            edition: edition,
            binding_mode: bindingMode,
            enabled_modules: enabledModules,
            max_users: maxUsers,
            issue_date: issueDate,
            expiry_date: expiryDate,
            grace_period_days: gracePeriod
        };

        console.log('\n📋 License Preview:');
        console.log(JSON.stringify(licenseData, null, 2));

        const confirm = await ask(rl, '\nGenerate license? (yes/no): ');
        if (confirm.toLowerCase() !== 'yes') {
            console.log('❌ Aborted.');
            rl.close();
            return;
        }

        // Sign the license
        const signedLicense = signLicense(licenseData, PRIVATE_KEY_FILE);

        // Save license file
        const fileName = `license_${labName.replace(/[^a-zA-Z0-9]/g, '_')}_${issueDate}.lic`;
        const outputPath = path.join(process.cwd(), fileName);
        fs.writeFileSync(outputPath, JSON.stringify(signedLicense, null, 2));

        console.log(`\n✅ License generated successfully!`);
        console.log(`📁 File: ${outputPath}`);
        console.log(`\n🔑 License ID: ${licenseData.license_id}`);
        console.log(`📅 Valid until: ${expiryDate}`);
        console.log(`📦 Modules: ${enabledModules.join(', ')}`);

    } finally {
        rl.close();
    }
}

// Create license from config file
async function createLicenseFromConfig(configPath: string): Promise<void> {
    console.log(`\n📝 Creating license from config: ${configPath}\n`);

    if (!fs.existsSync(PRIVATE_KEY_FILE)) {
        console.log('❌ Private key not found. Run `keygen` first.');
        return;
    }

    if (!fs.existsSync(configPath)) {
        console.log(`❌ Config file not found: ${configPath}`);
        return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const licenseData: LicenseData = {
        license_id: config.license_id || generateLicenseId(),
        lab_name: config.lab_name,
        issued_to: config.issued_to,
        machine_id_hash: config.machine_id_hash || null,
        edition: config.edition || 'ANNUAL',
        binding_mode: config.binding_mode || 'SOFT',
        enabled_modules: config.enabled_modules || ['BILLING'],
        max_users: config.max_users || 5,
        issue_date: config.issue_date || new Date().toISOString().split('T')[0],
        expiry_date: config.expiry_date,
        grace_period_days: config.grace_period_days || 14
    };

    const signedLicense = signLicense(licenseData, PRIVATE_KEY_FILE);

    const fileName = `license_${licenseData.lab_name.replace(/[^a-zA-Z0-9]/g, '_')}_${licenseData.issue_date}.lic`;
    const outputPath = path.join(process.cwd(), fileName);
    fs.writeFileSync(outputPath, JSON.stringify(signedLicense, null, 2));

    console.log(`✅ License generated: ${outputPath}`);
    console.log(`🔑 License ID: ${licenseData.license_id}`);
}

// Show help
function showHelp(): void {
    console.log(`
📜 License Generator CLI

Usage:
  npx ts-node generate-license.ts <command> [options]

Commands:
  keygen              Generate new RSA key pair (first time setup)
  create              Create a new license interactively
  create --config     Create license from a JSON config file
  help                Show this help message

Examples:
  npx ts-node generate-license.ts keygen
  npx ts-node generate-license.ts create
  npx ts-node generate-license.ts create --config license-config.json

Config File Format:
{
  "lab_name": "ABC Diagnostics",
  "issued_to": "Dr. John Smith",
  "machine_id_hash": "...",
  "edition": "ANNUAL",
  "binding_mode": "SOFT",
  "enabled_modules": ["BILLING", "QC_AUDIT"],
  "max_users": 5,
  "expiry_date": "2027-01-01",
  "grace_period_days": 14
}
`);
}

// Main entry point
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'keygen':
            await generateKeyPair();
            break;

        case 'create':
            if (args[1] === '--config' && args[2]) {
                await createLicenseFromConfig(args[2]);
            } else {
                await createLicenseInteractive();
            }
            break;

        case 'help':
        case '--help':
        case '-h':
            showHelp();
            break;

        default:
            console.log('Unknown command. Use --help for usage.');
            showHelp();
            break;
    }
}

main().catch(console.error);
