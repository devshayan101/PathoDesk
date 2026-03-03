const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

app.whenReady().then(() => {
  const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'pathodesk', 'patholab.db');
  console.log('Opening DB at:', dbPath);
  
  try {
    const db = new Database(dbPath);
    
    db.pragma('foreign_keys = OFF');
    console.log('Clearing test related tables...');
    db.prepare('DELETE FROM critical_values').run();
    db.prepare('DELETE FROM reference_ranges').run();
    db.prepare('DELETE FROM test_parameters').run();
    db.prepare('DELETE FROM test_versions').run();
    db.prepare('DELETE FROM tests').run();

    console.log('Clearing users except admin...');
    db.prepare('DELETE FROM users WHERE username != ?').run('admin');

    console.log('Clearing orders and results...');
    db.prepare('DELETE FROM test_results').run();
    db.prepare('DELETE FROM order_tests').run();
    db.prepare('DELETE FROM samples').run();
    db.prepare('DELETE FROM invoice_items').run();
    db.prepare('DELETE FROM payments').run();
    db.prepare('DELETE FROM invoices').run();
    db.prepare('DELETE FROM orders').run();

    db.pragma('foreign_keys = ON');
    console.log('Cleanup complete!');
    db.close();
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    app.quit();
    process.exit(0);
  }
});
