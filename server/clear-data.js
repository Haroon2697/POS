const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'db', 'pos.db');

// Connect to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
  clearData();
});

function clearData() {
  console.log('\n🧹 Starting data cleanup...\n');
  
  db.serialize(() => {
    // Clear transaction items first (due to foreign key constraints)
    db.run('DELETE FROM transaction_items', function(err) {
      if (err) {
        console.error('❌ Error clearing transaction_items:', err.message);
      } else {
        console.log(`✅ Cleared ${this.changes} transaction items`);
      }
    });

    // Clear transactions
    db.run('DELETE FROM transactions', function(err) {
      if (err) {
        console.error('❌ Error clearing transactions:', err.message);
      } else {
        console.log(`✅ Cleared ${this.changes} transactions`);
      }
    });

    // Clear customers (optional - keeps customer data)
    db.run('DELETE FROM customers', function(err) {
      if (err) {
        console.error('❌ Error clearing customers:', err.message);
      } else {
        console.log(`✅ Cleared ${this.changes} customer records`);
      }
    });

    // Reset auto-increment counters
    db.run('DELETE FROM sqlite_sequence WHERE name IN ("transactions", "transaction_items", "customers")', function(err) {
      if (err) {
        console.error('❌ Error resetting auto-increment:', err.message);
      } else {
        console.log('✅ Reset auto-increment counters');
      }
    });

    // Verify data is cleared
    setTimeout(() => {
      db.get('SELECT COUNT(*) as count FROM transactions', (err, row) => {
        if (err) {
          console.error('❌ Error checking transactions:', err.message);
        } else {
          console.log(`\n📊 Verification: ${row.count} transactions remaining`);
        }
        
        db.get('SELECT COUNT(*) as count FROM transaction_items', (err, row) => {
          if (err) {
            console.error('❌ Error checking transaction items:', err.message);
          } else {
            console.log(`📊 Verification: ${row.count} transaction items remaining`);
          }
          
          db.get('SELECT COUNT(*) as count FROM customers', (err, row) => {
            if (err) {
              console.error('❌ Error checking customers:', err.message);
            } else {
              console.log(`📊 Verification: ${row.count} customers remaining`);
            }
            
            console.log('\n🎉 Data cleanup completed successfully!');
            console.log('\n📋 What was cleared:');
            console.log('   • All sales transactions');
            console.log('   • All transaction items');
            console.log('   • All customer records');
            console.log('   • Auto-increment counters reset');
            console.log('\n📋 What was preserved:');
            console.log('   • All products and inventory');
            console.log('   • All user accounts');
            console.log('   • System settings');
            
            db.close((err) => {
              if (err) {
                console.error('❌ Error closing database:', err.message);
              } else {
                console.log('\n🔒 Database connection closed');
              }
              process.exit(0);
            });
          });
        });
      });
    }, 1000);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Process interrupted by user');
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    }
    process.exit(0);
  });
});
