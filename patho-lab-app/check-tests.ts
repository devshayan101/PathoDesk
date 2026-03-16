import Database from 'better-sqlite3';
import * as path from 'path';
import * as os from 'os';

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'patholab', 'patholab.db');
const dbPath2 = path.join(os.homedir(), 'AppData', 'Roaming', 'patho-lab-app', 'patholab.db');

function checkDb(p: string) {
    console.log('Checking database at:', p);
    try {
        const db = new Database(p, { fileMustExist: true });
        
        console.log('--- Inactive tests with potentially original codes ---');
        const inactiveWithOriginalCode = db.prepare("SELECT id, test_code FROM tests WHERE is_active = 0 AND test_code NOT LIKE '%_DEL_%'").all();
        console.log('Count:', inactiveWithOriginalCode.length);
        console.log(inactiveWithOriginalCode);

        console.log('--- All tests sample ---');
        const tests = db.prepare("SELECT id, test_code, is_active FROM tests LIMIT 10").all();
        console.log(tests);

        db.close();
    } catch (e: any) {
        console.error("Error reading db:", e.message);
    }
}

checkDb(dbPath);
checkDb(dbPath2);
