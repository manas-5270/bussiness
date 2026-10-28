const dotenv = require('dotenv');
dotenv.config();

const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Business = require('../models/Business');
const Department = require('../models/Department');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Recommendation = require('../models/Recommendation');
const Notification = require('../models/Notification');
const { createSeedPayload } = require('./seedData');

const seedDatabase = async (exitOnComplete = true) => {
  try {
    console.log('[Seeder] Starting database seeding...');
    await connectDB();

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Business.deleteMany({}),
      Department.deleteMany({}),
      Budget.deleteMany({}),
      Transaction.deleteMany({}),
      Recommendation.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('[Seeder] Cleared previous database collections.');

    const seedPayload = await createSeedPayload();

    // 1. Create Business
    const business = await Business.create(seedPayload.business);
    console.log(`[Seeder] Created Business: ${business.name} (ID: ${business._id})`);

    // 2. Create Users with businessId
    const createdUsers = [];
    for (const u of seedPayload.users) {
      const user = await User.create({
        ...u,
        businessId: business._id,
      });
      createdUsers.push(user);
    }
    console.log(`[Seeder] Created ${createdUsers.length} Users (Admin: admin@nexora.com / Admin@123, Manager: finance@nexora.com / Finance@123)`);

    // Assign owner to business
    business.ownerId = createdUsers[0]._id;
    await business.save();

    // 3. Create Departments
    const createdDepts = [];
    for (const d of seedPayload.departments) {
      const dept = await Department.create({
        ...d,
        businessId: business._id,
      });
      createdDepts.push(dept);
    }
    console.log(`[Seeder] Created ${createdDepts.length} Departments.`);

    // 4. Create Budgets
    const createdBudgets = [];
    for (const b of seedPayload.budgets) {
      const budget = await Budget.create({
        ...b,
        businessId: business._id,
        createdBy: createdUsers[0]._id,
      });
      createdBudgets.push(budget);
    }
    console.log(`[Seeder] Created ${createdBudgets.length} Budgets.`);

    // 5. Create Transactions
    const createdTransactions = [];
    for (const t of seedPayload.transactions) {
      const tx = await Transaction.create({
        ...t,
        businessId: business._id,
        createdBy: createdUsers[1]._id,
      });
      createdTransactions.push(tx);
    }
    console.log(`[Seeder] Created ${createdTransactions.length} Transactions.`);

    // 6. Create Recommendations
    for (const r of seedPayload.recommendations) {
      await Recommendation.create({
        ...r,
        businessId: business._id,
      });
    }
    console.log(`[Seeder] Created ${seedPayload.recommendations.length} Optimization Recommendations.`);

    // 7. Create Notifications
    for (const n of seedPayload.notifications) {
      await Notification.create({
        ...n,
        businessId: business._id,
        userId: createdUsers[0]._id,
      });
    }
    console.log(`[Seeder] Created ${seedPayload.notifications.length} Notifications.`);

    console.log('[Seeder] Database seeding completed successfully! ✨');

    if (exitOnComplete) {
      await disconnectDB();
      process.exit(0);
    }
    return true;
  } catch (error) {
    console.error('[Seeder] Error during seeding:', error);
    if (exitOnComplete) {
      process.exit(1);
    }
    throw error;
  }
};

// Check if run directly from CLI
if (require.main === module) {
  seedDatabase(true);
}

module.exports = { seedDatabase };
