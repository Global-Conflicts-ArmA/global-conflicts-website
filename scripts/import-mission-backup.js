/**
 * Import Mission Backup from JSON
 *
 * This script downloads and imports a JSON backup of missions from the production database.
 * Usage: node scripts/import-mission-backup.js
 */

const { MongoClient } = require('mongodb');
const https = require('https');
const fs = require('fs');
const path = require('path');

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'prod';

// Backup file URL
const BACKUP_URL = 'https://files.catbox.moe/01rho9.json';
const TEMP_FILE = path.join(__dirname, 'mission-backup-temp.json');

async function downloadBackup() {
  console.log('📥 Downloading backup file from:', BACKUP_URL);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(TEMP_FILE);

    https.get(BACKUP_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('✅ Download complete');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(TEMP_FILE, () => {}); // Clean up
      reject(err);
    });
  });
}

async function importMissions() {
  console.log('\n🌱 Starting mission import...\n');

  try {
    // Download the backup file
    await downloadBackup();

    // Read and parse the JSON
    console.log('📖 Reading backup file...');
    const fileContent = fs.readFileSync(TEMP_FILE, 'utf8');
    const missions = JSON.parse(fileContent);

    console.log(`✅ Found ${missions.length} missions in backup\n`);

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Ask what to do with existing missions
    console.log('⚠️  This will replace existing Arma 3 missions in your local database.');
    console.log('   (Reforger missions will not be affected)\n');

    // Clear existing Arma 3 missions
    console.log('🗑️  Clearing existing Arma 3 missions...');
    const deleteResult = await db.collection('missions').deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing missions\n`);

    // Process missions to handle MongoDB ObjectId and Date conversions
    console.log('🔄 Processing mission data...');
    missions.forEach((mission) => {
      // Convert date strings back to Date objects if needed
      if (mission.uploadDate && typeof mission.uploadDate === 'string') {
        mission.uploadDate = new Date(mission.uploadDate);
      }
      if (mission.lastPlayed && typeof mission.lastPlayed === 'string') {
        mission.lastPlayed = new Date(mission.lastPlayed);
      }

      // Process updates array
      if (mission.updates) {
        mission.updates.forEach((update) => {
          if (update.date && typeof update.date === 'string') {
            update.date = new Date(update.date);
          }
        });
      }

      // Process history array
      if (mission.history) {
        mission.history.forEach((hist) => {
          if (hist.date && typeof hist.date === 'string') {
            hist.date = new Date(hist.date);
          }
        });
      }

      // Process media array
      if (mission.media) {
        mission.media.forEach((media) => {
          if (media.date && typeof media.date === 'string') {
            media.date = new Date(media.date);
          }
        });
      }
    });

    // Insert missions into database
    console.log('💾 Importing missions to database...');
    const insertResult = await db.collection('missions').insertMany(missions);
    console.log(`✅ Imported ${insertResult.insertedCount} missions\n`);

    // Show some statistics
    const stats = {
      total: missions.length,
      withHistory: missions.filter(m => m.history && m.history.length > 0).length,
      approved: missions.filter(m =>
        m.updates && m.updates.some(u =>
          u.testingAudit?.reviewState === 'review_accepted' ||
          u.reviewState === 'review_accepted'
        )
      ).length,
      pending: missions.filter(m =>
        m.updates && m.updates.some(u =>
          u.testingAudit?.reviewState === 'review_pending' ||
          u.reviewState === 'review_pending'
        )
      ).length,
    };

    console.log('📊 Import Statistics:');
    console.log(`   Total missions: ${stats.total}`);
    console.log(`   Missions with history: ${stats.withHistory}`);
    console.log(`   Approved missions: ${stats.approved}`);
    console.log(`   Pending review: ${stats.pending}\n`);

    // Clean up
    await client.close();
    fs.unlinkSync(TEMP_FILE);
    console.log('🧹 Cleaned up temporary files');
    console.log('✅ Import complete!\n');

    console.log('💡 Next steps:');
    console.log('   1. Visit http://localhost:3000/missions to see the imported Arma 3 missions');
    console.log('   2. The Reforger missions remain untouched at http://localhost:3000/reforger-missions\n');

  } catch (error) {
    console.error('❌ Error during import:', error.message);

    // Clean up temp file if it exists
    if (fs.existsSync(TEMP_FILE)) {
      fs.unlinkSync(TEMP_FILE);
    }

    process.exit(1);
  }
}

// Run the import
importMissions();
