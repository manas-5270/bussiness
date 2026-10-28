const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Recommendation = require('../models/Recommendation');
const Notification = require('../models/Notification');

/**
 * Smart Budget Optimization Engine
 * Pure modular business service designed for financial optimization.
 * Can be swapped or extended with Python ML / forecasting models in the future.
 */
class OptimizationEngine {
  /**
   * Run full optimization analysis for a business
   * @param {string|ObjectId} businessId 
   * @param {string} currentPeriod e.g., "2026-10"
   */
  static async analyzeAndGenerate(businessId, currentPeriod = null) {
    if (!currentPeriod) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      currentPeriod = `${now.getFullYear()}-${month}`;
    }

    // 1. Fetch all budgets for the current period
    const budgets = await Budget.find({ businessId, period: currentPeriod });

    // 2. Aggregate transactions for current period
    const [year, month] = currentPeriod.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Also get previous month range for Month-over-Month (MoM) comparison
    const prevStartDate = new Date(year, month - 2, 1);
    const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);

    const currentExpenses = await Transaction.aggregate([
      {
        $match: {
          businessId: new mongoose.Types.ObjectId(businessId),
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { department: '$department', category: '$category' },
          totalSpent: { $sum: '$amount' },
          count: { $sum: 1 },
          avgTxAmount: { $avg: '$amount' },
        },
      },
    ]);

    const prevExpenses = await Transaction.aggregate([
      {
        $match: {
          businessId: new mongoose.Types.ObjectId(businessId),
          type: 'expense',
          date: { $gte: prevStartDate, $lte: prevEndDate },
        },
      },
      {
        $group: {
          _id: { department: '$department', category: '$category' },
          totalSpent: { $sum: '$amount' },
        },
      },
    ]);

    // Map previous expenses for quick lookup
    const prevSpendMap = new Map();
    prevExpenses.forEach((pe) => {
      prevSpendMap.set(`${pe._id.department}:::${pe._id.category}`, pe.totalSpent);
    });

    // Map current expenses for quick lookup
    const currentSpendMap = new Map();
    currentExpenses.forEach((ce) => {
      currentSpendMap.set(`${ce._id.department}:::${ce._id.category}`, ce);
    });

    const recommendationsToCreate = [];
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthProgress = Math.max(0.1, dayOfMonth / daysInMonth);

    // Rule 1: Category Overspending & Run-Rate Projections
    for (const budget of budgets) {
      const key = `${budget.department}:::${budget.category}`;
      const expenseData = currentSpendMap.get(key);
      const spent = expenseData ? expenseData.totalSpent : 0;
      const allocated = budget.allocatedAmount;

      if (allocated > 0) {
        const utilizationRate = (spent / allocated) * 100;
        const projectedRunRate = (spent / monthProgress);
        const prevSpend = prevSpendMap.get(key) || 0;
        const momGrowth = prevSpend > 0 ? ((spent - prevSpend) / prevSpend) * 100 : 0;

        // Condition 1A: Severe Overspending (Already exceeded 90% or 100%)
        if (utilizationRate >= 95) {
          const suggestedCut = Math.round(allocated * 0.15);
          recommendationsToCreate.push({
            businessId,
            title: `Critical Budget Cap Breached: ${budget.category} (${budget.department})`,
            category: budget.category,
            department: budget.department,
            currentAllocation: allocated,
            suggestedAllocation: Math.round(allocated * 1.15), // suggest adjusted budget or stricter cap
            estimatedSavings: suggestedCut,
            reason: `${budget.category} has consumed ${utilizationRate.toFixed(1)}% of its allocated ₹${allocated.toLocaleString('en-IN')} limit with ${(100 - monthProgress * 100).toFixed(0)}% of the month remaining. Projected run-rate is ₹${Math.round(projectedRunRate).toLocaleString('en-IN')}.`,
            metrics: {
              currentSpend: spent,
              utilizationRate: Math.round(utilizationRate),
              momChangePercentage: Math.round(momGrowth),
              projectedRunRate: Math.round(projectedRunRate),
              benchmark: 'Department budget limit',
            },
            priority: 'High',
            status: 'Pending',
          });
        }

        // Condition 1B: High Run-rate Burn (on track to exceed budget significantly)
        else if (projectedRunRate > allocated * 1.25 && spent > 15000) {
          const estimatedExcess = Math.round(projectedRunRate - allocated);
          recommendationsToCreate.push({
            businessId,
            title: `Accelerated Burn Rate Detected: ${budget.category} in ${budget.department}`,
            category: budget.category,
            department: budget.department,
            currentAllocation: allocated,
            suggestedAllocation: allocated,
            estimatedSavings: estimatedExcess,
            reason: `Current spending velocity in ${budget.category} is tracking towards ₹${Math.round(projectedRunRate).toLocaleString('en-IN')}, exceeding the allocated budget by ₹${estimatedExcess.toLocaleString('en-IN')}. Immediate expense freeze or review recommended.`,
            metrics: {
              currentSpend: spent,
              utilizationRate: Math.round(utilizationRate),
              momChangePercentage: Math.round(momGrowth),
              projectedRunRate: Math.round(projectedRunRate),
              benchmark: 'Mid-month velocity check',
            },
            priority: 'High',
            status: 'Pending',
          });
        }

        // Condition 1C: Underutilized Budget (<40% utilization after 60% of month passed)
        else if (monthProgress >= 0.5 && utilizationRate < 40 && allocated >= 30000) {
          const surplusAmount = Math.round(allocated - spent - (allocated * 0.2));
          if (surplusAmount > 10000) {
            recommendationsToCreate.push({
              businessId,
              title: `Reallocate Surplus Capital from ${budget.category} (${budget.department})`,
              category: budget.category,
              department: budget.department,
              currentAllocation: allocated,
              suggestedAllocation: Math.round(allocated - surplusAmount),
              estimatedSavings: surplusAmount,
              reason: `Category is operating at only ${utilizationRate.toFixed(1)}% utilization. A capital surplus of ₹${surplusAmount.toLocaleString('en-IN')} can be reallocated to higher-demand initiatives in Technology or Sales without impacting operational capacity.`,
              metrics: {
                currentSpend: spent,
                utilizationRate: Math.round(utilizationRate),
                momChangePercentage: Math.round(momGrowth),
                projectedRunRate: Math.round(projectedRunRate),
                benchmark: 'Surplus rebalancing',
              },
              priority: 'Medium',
              status: 'Pending',
            });
          }
        }

        // Condition 1D: Sharp Month-over-Month Spike (>35% MoM increase)
        if (momGrowth > 35 && spent > 25000) {
          const excessMoM = Math.round(spent - prevSpend);
          recommendationsToCreate.push({
            businessId,
            title: `Unusual MoM Cost Surge: ${budget.category}`,
            category: budget.category,
            department: budget.department,
            currentAllocation: allocated,
            suggestedAllocation: Math.round(spent * 0.9),
            estimatedSavings: Math.round(excessMoM * 0.3),
            reason: `Spending surged by ${momGrowth.toFixed(1)}% compared to last month (₹${spent.toLocaleString('en-IN')} vs ₹${prevSpend.toLocaleString('en-IN')}). Audit recent vendor invoices or redundant subscription tiers.`,
            metrics: {
              currentSpend: spent,
              utilizationRate: Math.round(utilizationRate),
              momChangePercentage: Math.round(momGrowth),
              projectedRunRate: Math.round(projectedRunRate),
              benchmark: 'Month-over-Month baseline',
            },
            priority: 'Medium',
            status: 'Pending',
          });
        }
      }
    }

    // Rule 2: Recurring Subscriptions & High-frequency micro-expenses
    const recurringExpenses = await Transaction.aggregate([
      {
        $match: {
          businessId: new mongoose.Types.ObjectId(businessId),
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { vendor: '$vendor', category: '$category' },
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
      {
        $match: {
          count: { $gte: 3 },
          total: { $gte: 20000 },
        },
      },
    ]);

    for (const rec of recurringExpenses) {
      if (rec._id.vendor && rec._id.vendor.trim() !== '') {
        const potentialConsolidationSavings = Math.round(rec.total * 0.12); // ~12% enterprise/annual discount
        recommendationsToCreate.push({
          businessId,
          title: `Vendor Consolidation Opportunity: ${rec._id.vendor}`,
          category: rec._id.category,
          department: 'Operations',
          currentAllocation: rec.total,
          suggestedAllocation: rec.total - potentialConsolidationSavings,
          estimatedSavings: potentialConsolidationSavings,
          reason: `Found ${rec.count} separate billing transactions for vendor '${rec._id.vendor}' totaling ₹${rec.total.toLocaleString('en-IN')}. Negotiating an annual upfront enterprise billing plan typically unlocks 10-15% in direct savings.`,
          metrics: {
            currentSpend: rec.total,
            utilizationRate: 100,
            momChangePercentage: 0,
            projectedRunRate: rec.total,
            benchmark: 'Vendor tier optimization',
          },
          priority: 'Low',
          status: 'Pending',
        });
      }
    }

    // De-duplicate and save only fresh recommendations that don't already exist in 'Pending' state
    const savedRecs = [];
    for (const rec of recommendationsToCreate) {
      const existing = await Recommendation.findOne({
        businessId,
        title: rec.title,
        status: 'Pending',
      });

      if (!existing) {
        const created = await Recommendation.create(rec);
        savedRecs.push(created);

        // Also trigger in-app notification if High priority
        if (rec.priority === 'High') {
          await Notification.create({
            businessId,
            title: `High Priority Optimization: ${rec.title}`,
            message: rec.reason,
            type: 'warning',
            link: '/optimization',
          });
        }
      }
    }

    return await Recommendation.find({ businessId }).sort({ priority: 1, createdAt: -1 });
  }
}

module.exports = OptimizationEngine;
