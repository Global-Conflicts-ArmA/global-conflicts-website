/**
 * Import Mission Backup from Local JSON File
 *
 * Usage:
 * 1. Download the backup JSON file from https://files.catbox.moe/01rho9.json
 * 2. Save it as 'mission-backup.json' in the scripts folder
 * 3. Run: node scripts/import-mission-backup-local.js
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'prod';

// Backup file path - place your downloaded JSON here
const BACKUP_FILE = 'C:\\Users\\Per k\\Documents\\GitHub\\global-conflicts-website\\01rho9.json';

async function importMissions() {
  console.log('\n🌱 Starting mission import...\n');

  try {
    // Check if backup file exists
    if (!fs.existsSync(BACKUP_FILE)) {
      console.error('❌ Backup file not found!');
      console.log('\n📝 Instructions:');
      console.log('   1. Download: https://files.catbox.moe/01rho9.json');
      console.log(`   2. Save as: ${BACKUP_FILE}`);
      console.log('   3. Run this script again\n');
      process.exit(1);
    }

    // Read and parse the JSON
    console.log('📖 Reading backup file...');
    const fileContent = fs.readFileSync(BACKUP_FILE, 'utf8');
    const missions = JSON.parse(fileContent);

    console.log(`✅ Found ${missions.length} missions in backup\n`);

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Clear existing Arma 3 missions
    console.log('⚠️  Clearing existing Arma 3 missions...');
    console.log('   (Reforger missions will not be affected)');
    const deleteResult = await db.collection('missions').deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing missions\n`);

    // Process missions to handle MongoDB ObjectId and Date conversions
    console.log('🔄 Processing mission data...');
    let processedCount = 0;

    missions.forEach((mission) => {
      // Convert date strings back to Date objects if needed
      if (mission.uploadDate) {
        if (typeof mission.uploadDate === 'string') {
          mission.uploadDate = new Date(mission.uploadDate);
        } else if (mission.uploadDate.$date) {
          mission.uploadDate = new Date(mission.uploadDate.$date);
        }
      }

      if (mission.lastPlayed) {
        if (typeof mission.lastPlayed === 'string') {
          mission.lastPlayed = new Date(mission.lastPlayed);
        } else if (mission.lastPlayed.$date) {
          mission.lastPlayed = new Date(mission.lastPlayed.$date);
        }
      }

      // Process updates array
      if (mission.updates) {
        mission.updates.forEach((update) => {
          if (update.date) {
            if (typeof update.date === 'string') {
              update.date = new Date(update.date);
            } else if (update.date.$date) {
              update.date = new Date(update.date.$date);
            }
          }
          // Remove MongoDB-specific fields
          delete update._id;
        });
      }

      // Process history array
      if (mission.history) {
        mission.history.forEach((hist) => {
          if (hist.date) {
            if (typeof hist.date === 'string') {
              hist.date = new Date(hist.date);
            } else if (hist.date.$date) {
              hist.date = new Date(hist.date.$date);
            }
          }
          // Remove MongoDB-specific fields
          delete hist._id;
          if (hist.leaders) {
            hist.leaders.forEach(leader => {
              delete leader._id;
            });
          }
        });
      }

      // Process media array
      if (mission.media) {
        mission.media.forEach((media) => {
          if (media.date) {
            if (typeof media.date === 'string') {
              media.date = new Date(media.date);
            } else if (media.date.$date) {
              media.date = new Date(media.date.$date);
            }
          }
          // Remove MongoDB-specific fields
          delete media._id;
        });
      }

      // Process reports
      if (mission.reports) {
        mission.reports.forEach(report => {
          delete report._id;
        });
      }

      // Process reviews
      if (mission.reviews) {
        mission.reviews.forEach(review => {
          delete review._id;
        });
      }

      // Process ratings
      if (mission.ratings) {
        mission.ratings.forEach(rating => {
          delete rating._id;
        });
      }

      // Remove main _id if it exists
      delete mission._id;

      processedCount++;
      if (processedCount % 10 === 0) {
        process.stdout.write(`   Processed ${processedCount}/${missions.length} missions\r`);
      }
    });

    console.log(`✅ Processed ${processedCount} missions\n`);

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
      terrains: [...new Set(missions.map(m => m.terrain))].length,
      authors: [...new Set(missions.map(m => m.authorID))].length,
    };

    console.log('📊 Import Statistics:');
    console.log(`   Total missions: ${stats.total}`);
    console.log(`   Missions with history: ${stats.withHistory}`);
    console.log(`   Approved missions: ${stats.approved}`);
    console.log(`   Pending review: ${stats.pending}`);
    console.log(`   Unique terrains: ${stats.terrains}`);
    console.log(`   Unique authors: ${stats.authors}\n`);

    // Clean up
    await client.close();
    console.log('✅ Import complete!\n');

    console.log('💡 Next steps:');
    console.log('   1. Visit http://localhost:3000/missions to see the imported Arma 3 missions');
    console.log('   2. The Reforger missions remain untouched at http://localhost:3000/reforger-missions');
    console.log('   3. You can delete the backup file if you want\n');

  } catch (error) {
    console.error('❌ Error during import:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the import
importMissions();
