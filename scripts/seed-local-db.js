/**
 * Local Database Seeding Script
 *
 * This script populates a local MongoDB instance with sample data for development.
 * Run with: node scripts/seed-local-db.js
 */

const { MongoClient } = require('mongodb');

// MongoDB connection string (from .env.local)
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'prod';

// Sample Discord IDs (you can use your own Discord ID if you know it)
const SAMPLE_USER_DISCORD_ID = '123456789012345678';
const SAMPLE_USER_2_DISCORD_ID = '987654321098765432';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);

    // Clear existing data (optional - comment out if you want to keep data)
    console.log('\n🗑️  Clearing existing data...');
    await db.collection('users').deleteMany({});
    await db.collection('missions').deleteMany({});
    await db.collection('reforger_missions').deleteMany({});
    await db.collection('configs').deleteMany({});
    console.log('✅ Cleared existing data');

    // ============================================
    // 1. Create Sample Users
    // ============================================
    console.log('\n👤 Creating sample users...');

    const users = [
      {
        discord_id: SAMPLE_USER_DISCORD_ID,
        username: 'LocalDevUser',
        nickname: 'Dev Admin',
        email: 'dev@localhost.com',
        image: 'https://cdn.discordapp.com/embed/avatars/0.png',
        roles: [
          'ADMIN',
          'MISSION_MAKER',
          'MISSION_REVIEWER',
          'GM',
          'MEMBER'
        ],
        emailVerified: null
      },
      {
        discord_id: SAMPLE_USER_2_DISCORD_ID,
        username: 'TestMissionMaker',
        nickname: 'Mission Creator',
        email: 'maker@localhost.com',
        image: 'https://cdn.discordapp.com/embed/avatars/1.png',
        roles: [
          'MISSION_MAKER',
          'MEMBER'
        ],
        emailVerified: null
      }
    ];

    await db.collection('users').insertMany(users);
    console.log(`✅ Created ${users.length} sample users`);

    // ============================================
    // 2. Create Config
    // ============================================
    console.log('\n⚙️  Creating site configuration...');

    const config = {
      max_votes: 3,
      allowed_terrains: [
        {
          class: 'Altis',
          display_name: 'Altis',
          imageURL: 'https://launcher.globalconflicts.net/media/terrain_pics/altis.jpg'
        },
        {
          class: 'Stratis',
          display_name: 'Stratis',
          imageURL: 'https://launcher.globalconflicts.net/media/terrain_pics/stratis.jpg'
        },
        {
          class: 'Tanoa',
          display_name: 'Tanoa',
          imageURL: 'https://launcher.globalconflicts.net/media/terrain_pics/tanoa.jpg'
        },
        {
          class: 'Malden',
          display_name: 'Malden',
          imageURL: 'https://launcher.globalconflicts.net/media/terrain_pics/malden.jpg'
        }
      ],
      reforger_allowed_terrains: [
        {
          class: 'Everon',
          display_name: 'Everon',
          guid: '59AD59368765F605',
          imageURL: 'https://launcher.globalconflicts.net/media/terrain_pics/everon.jpg'
        },
        {
          class: 'Arland',
          display_name: 'Arland',
          guid: 'AA6C8912B575921D',
          imageURL: 'https://launcher.globalconflicts.net/media/terrain_pics/arland.jpg'
        }
      ],
      mission_review_questions: [
        {
          question: 'Does the mission work as intended?',
          type: 'boolean'
        },
        {
          question: 'Are there any critical bugs?',
          type: 'boolean'
        },
        {
          question: 'Is the mission balanced?',
          type: 'boolean'
        }
      ],
      reforger_github_repo: 'global-conflicts/reforger-missions',
      reforger_github_branch: 'main'
    };

    await db.collection('configs').insertOne(config);
    console.log('✅ Created site configuration');

    // ============================================
    // 3. Create Sample Arma 3 Missions
    // ============================================
    console.log('\n🎮 Creating sample Arma 3 missions...');

    const arma3Missions = [
      {
        uniqueName: 'test-mission-altis',
        name: 'Test Mission - Altis Assault',
        description: '# Sample Mission\n\nThis is a test mission for local development.\n\n## Objectives\n- Capture the town\n- Defend against counter-attack\n- Extract via helicopter',
        descriptionNoMarkdown: 'This is a test mission for local development.',
        authorID: SAMPLE_USER_DISCORD_ID,
        uploadDate: new Date('2024-01-15'),
        lastPlayed: new Date('2024-02-20'),
        terrain: 'Altis',
        terrainName: 'Altis',
        size: {
          min: 20,
          max: 40
        },
        type: 'CO',
        timeOfDay: 'Morning',
        era: '2020',
        respawn: false,
        jip: true,
        tags: [
          'Infantry Only',
          'Assault',
          'Helicopters',
          'Defense'
        ],
        isUnlisted: false,
        onMainServer: true,
        votes: [SAMPLE_USER_2_DISCORD_ID],
        ratings: [
          {
            ratingAuthorId: SAMPLE_USER_2_DISCORD_ID,
            value: 'positive'
          }
        ],
        updates: [
          {
            version: {
              major: 1,
              minor: '0'
            },
            fileName: 'co_test_mission_v1_0.Altis.pbo',
            date: new Date('2024-01-15'),
            authorID: SAMPLE_USER_DISCORD_ID,
            changeLog: 'Initial release',
            testingAudit: {
              reviewState: 'review_accepted',
              reviewerNotes: 'Mission works well, balanced gameplay'
            }
          },
          {
            version: {
              major: 1,
              minor: '1'
            },
            fileName: 'co_test_mission_v1_1.Altis.pbo',
            date: new Date('2024-02-10'),
            authorID: SAMPLE_USER_DISCORD_ID,
            changeLog: '- Fixed respawn bug\n- Added more vehicles\n- Improved AI behavior',
            testingAudit: {
              reviewState: 'review_accepted',
              reviewerNotes: 'Improvements look good'
            }
          }
        ],
        history: [
          {
            date: new Date('2024-02-20'),
            outcome: 'BLUFOR Victory',
            aarReplayLink: 'https://example.com/replay1',
            gmNote: 'Great mission! Players enjoyed it.',
            leaders: [
              {
                discordID: SAMPLE_USER_2_DISCORD_ID,
                side: 'BLUFOR',
                role: 'leader',
                aar: '# After Action Report\n\nMission went smoothly. We captured the town with minimal casualties.'
              }
            ]
          }
        ],
        reports: [],
        reviews: [
          {
            authorID: SAMPLE_USER_2_DISCORD_ID,
            text: 'Great mission! Really enjoyed the pacing and the objectives were clear.',
            createdAt: new Date('2024-02-21')
          }
        ],
        media: [],
        lastVersion: {
          major: 1,
          minor: '1'
        }
      },
      {
        uniqueName: 'test-mission-stratis-tvt',
        name: 'Stratis TVT - Hill Control',
        description: 'A competitive TVT mission where two teams fight for control of strategic hills.',
        descriptionNoMarkdown: 'A competitive TVT mission where two teams fight for control of strategic hills.',
        authorID: SAMPLE_USER_2_DISCORD_ID,
        uploadDate: new Date('2024-03-01'),
        lastPlayed: null,
        terrain: 'Stratis',
        terrainName: 'Stratis',
        size: {
          min: 10,
          max: 30
        },
        type: 'TVT',
        timeOfDay: 'Evening',
        era: '2020',
        respawn: 'Objective/gameplay based',
        jip: false,
        tags: [
          'Infantry Only',
          'Meeting Engagement',
          'No radios for grunts'
        ],
        isUnlisted: false,
        onMainServer: false,
        votes: [],
        ratings: [],
        updates: [
          {
            version: {
              major: 1,
              minor: '0'
            },
            fileName: 'tvt_stratis_hills_v1_0.Stratis.pbo',
            date: new Date('2024-03-01'),
            authorID: SAMPLE_USER_2_DISCORD_ID,
            changeLog: 'Initial release',
            testingAudit: {
              reviewState: 'review_pending'
            }
          }
        ],
        history: [],
        reports: [],
        reviews: [],
        media: [],
        lastVersion: {
          major: 1,
          minor: '0'
        }
      }
    ];

    await db.collection('missions').insertMany(arma3Missions);
    console.log(`✅ Created ${arma3Missions.length} sample Arma 3 missions`);

    // ============================================
    // 4. Create Sample Reforger Missions (NEW!)
    // ============================================
    console.log('\n🆕 Creating sample Reforger missions...');

    const reforgerMissions = [
      {
        uniqueName: 'reforger-test-everon-assault',
        name: 'Everon Assault - Harbor Capture',
        description: '# Reforger Mission\n\nCapture the harbor on Everon island.\n\n## Features\n- Combined arms gameplay\n- Dynamic weather\n- Realistic ballistics',
        descriptionNoMarkdown: 'Capture the harbor on Everon island.',
        authorID: SAMPLE_USER_DISCORD_ID,
        uploadDate: new Date('2024-03-10'),
        lastPlayed: new Date('2024-03-15'),
        terrain: 'Everon',
        terrainName: 'Everon',
        size: {
          min: 15,
          max: 35
        },
        type: 'CO',
        timeOfDay: 'Morning',
        era: '1980',
        respawn: false,
        jip: true,
        tags: [
          'APCs',
          'Helicopters',
          'Assault',
          'Air assault'
        ],
        isUnlisted: false,

        // GitHub-specific fields (NEW!)
        githubRepo: 'global-conflicts/reforger-missions',
        githubPath: 'missions/everon-harbor-assault',

        votes: [SAMPLE_USER_2_DISCORD_ID],
        ratings: [
          {
            ratingAuthorId: SAMPLE_USER_2_DISCORD_ID,
            value: 'positive'
          }
        ],
        updates: [
          {
            version: {
              major: 1,
              minor: '0'
            },
            // GitHub-specific update fields (replacing fileName)
            githubCommit: 'a1b2c3d4e5f6',
            githubBranch: 'main',
            githubUrl: 'https://github.com/global-conflicts/reforger-missions/tree/main/missions/everon-harbor-assault',
            date: new Date('2024-03-10'),
            authorID: SAMPLE_USER_DISCORD_ID,
            changeLog: 'Initial release for Reforger',
            testingAudit: {
              reviewState: 'review_accepted',
              reviewerNotes: 'Works great in Reforger!'
            }
          }
        ],
        history: [
          {
            date: new Date('2024-03-15'),
            outcome: 'Victory',
            aarReplayLink: 'https://example.com/reforger-replay1',
            gmNote: 'First Reforger mission played!',
            leaders: [
              {
                discordID: SAMPLE_USER_DISCORD_ID,
                side: 'US',
                role: 'leader',
                aar: 'Successful assault on the harbor. Reforger gameplay feels great!'
              }
            ]
          }
        ],
        reports: [],
        reviews: [],
        media: [],
        lastVersion: {
          major: 1,
          minor: '0'
        },
        playCount: 1
      },
      {
        uniqueName: 'reforger-test-arland-defense',
        name: 'Arland Defense - Airfield Hold',
        description: 'Defend the airfield against incoming enemy forces.',
        descriptionNoMarkdown: 'Defend the airfield against incoming enemy forces.',
        authorID: SAMPLE_USER_2_DISCORD_ID,
        uploadDate: new Date('2024-03-20'),
        lastPlayed: null,
        terrain: 'Arland',
        terrainName: 'Arland',
        size: {
          min: 20,
          max: 40
        },
        type: 'CO',
        timeOfDay: 'Night',
        era: '1980',
        respawn: 'Objective/gameplay based',
        jip: false,
        tags: [
          'Defense',
          'Infantry Only',
          'Delay'
        ],
        isUnlisted: false,

        // GitHub-specific fields
        githubRepo: 'global-conflicts/reforger-missions',
        githubPath: 'missions/arland-airfield-defense',

        votes: [],
        ratings: [],
        updates: [
          {
            version: {
              major: 1,
              minor: '0'
            },
            githubCommit: 'f6e5d4c3b2a1',
            githubBranch: 'main',
            githubUrl: 'https://github.com/global-conflicts/reforger-missions/tree/main/missions/arland-airfield-defense',
            date: new Date('2024-03-20'),
            authorID: SAMPLE_USER_2_DISCORD_ID,
            changeLog: 'Initial release',
            testingAudit: {
              reviewState: 'review_pending'
            }
          }
        ],
        history: [],
        reports: [],
        reviews: [],
        media: [],
        lastVersion: {
          major: 1,
          minor: '0'
        },
        playCount: 0
      }
    ];

    await db.collection('reforger_missions').insertMany(reforgerMissions);
    console.log(`✅ Created ${reforgerMissions.length} sample Reforger missions`);

    // ============================================
    // Summary
    // ============================================
    console.log('\n✅ Database seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Arma 3 Missions: ${arma3Missions.length}`);
    console.log(`   - Reforger Missions: ${reforgerMissions.length}`);
    console.log(`   - Config: 1`);

    console.log('\n👤 Test User Credentials:');
    console.log(`   Discord ID: ${SAMPLE_USER_DISCORD_ID}`);
    console.log(`   Username: LocalDevUser`);
    console.log(`   Roles: ADMIN, MISSION_MAKER, MISSION_REVIEWER, GM, MEMBER`);

    console.log('\n💡 Next Steps:');
    console.log('   1. Run: yarn dev');
    console.log('   2. Visit: http://localhost:3000');
    console.log('   3. Login with Discord (you\'ll be a new user initially)');
    console.log('   4. Manually update your Discord ID in MongoDB to match one of the test users');
    console.log('      to get admin permissions\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run the seeding
seedDatabase();
