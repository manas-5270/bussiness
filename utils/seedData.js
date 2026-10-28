const bcrypt = require('bcryptjs');

const createSeedPayload = async () => {
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', salt);
  const managerPasswordHash = await bcrypt.hash('Finance@123', salt);

  const business = {
    name: 'Nexora Cloud Technologies Pvt Ltd',
    industry: 'Enterprise SaaS & Cloud Infrastructure',
    currency: 'INR',
    fiscalYearStart: 'April',
    address: {
      street: 'Tower 4, Embassy TechVillage, Outer Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560103',
      country: 'India',
    },
    settings: {
      budgetWarningThreshold: 80,
      budgetDangerThreshold: 90,
      autoOptimization: true,
    },
  };

  const users = [
    {
      name: 'Aditya Verma',
      email: 'admin@nexora.com',
      passwordHash: adminPasswordHash,
      role: 'Admin',
      department: 'Executive Management',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Priya Sundaram',
      email: 'finance@nexora.com',
      passwordHash: managerPasswordHash,
      role: 'Finance Manager',
      department: 'Finance & Treasury',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    },
  ];

  const departments = [
    {
      name: 'Technology',
      code: 'TECH',
      head: 'Rahul Sharma',
      description: 'Core engineering, cloud architecture, devops, and security',
      color: '#2563eb', // blue
      teamSize: 28,
    },
    {
      name: 'Marketing',
      code: 'MKTG',
      head: 'Ananya Deshmukh',
      description: 'Brand awareness, digital growth campaigns, SEO, and PR',
      color: '#8b5cf6', // purple
      teamSize: 12,
    },
    {
      name: 'Operations',
      code: 'OPS',
      head: 'Vikram Malhotra',
      description: 'Workplace facilities, legal compliance, SaaS tools, and vendors',
      color: '#06b6d4', // cyan
      teamSize: 15,
    },
    {
      name: 'Sales',
      code: 'SALES',
      head: 'Kavita Nair',
      description: 'Domestic and international enterprise client acquisition',
      color: '#10b981', // emerald
      teamSize: 20,
    },
    {
      name: 'Human Resources',
      code: 'HR',
      head: 'Siddharth Sen',
      description: 'Talent recruitment, employee wellness, training, and culture',
      color: '#f59e0b', // amber
      teamSize: 8,
    },
  ];

  // Current year and month
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthStr = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  const budgets = [
    // Current Period Budgets
    { department: 'Technology', category: 'Cloud Infrastructure & Servers', allocatedAmount: 450000, period: currentMonthStr, notes: 'AWS & GCP primary production clusters' },
    { department: 'Technology', category: 'Software Licenses & Tooling', allocatedAmount: 220000, period: currentMonthStr, notes: 'GitHub Enterprise, JetBrains, Datadog' },
    { department: 'Technology', category: 'Hardware & Workstations', allocatedAmount: 180000, period: currentMonthStr, notes: 'M3 Pro MacBooks for new engineering hires' },

    { department: 'Marketing', category: 'Digital Ads & Performance', allocatedAmount: 380000, period: currentMonthStr, notes: 'Google Search Ads & LinkedIn B2B campaigns' },
    { department: 'Marketing', category: 'Conferences & Sponsorships', allocatedAmount: 200000, period: currentMonthStr, notes: 'SaaS India Summit sponsorship booth' },
    { department: 'Marketing', category: 'Content & Freelancers', allocatedAmount: 110000, period: currentMonthStr, notes: 'Technical blog writers and graphic design agency' },

    { department: 'Operations', category: 'Office Rent & Facilities', allocatedAmount: 350000, period: currentMonthStr, notes: 'WeWork premium managed office lease' },
    { department: 'Operations', category: 'Corporate Utilities & Internet', allocatedAmount: 75000, period: currentMonthStr, notes: 'Tata Tele broadband and backup power' },
    { department: 'Operations', category: 'Legal & Accounting Audits', allocatedAmount: 120000, period: currentMonthStr, notes: 'Quarterly compliance and statutory audits' },

    { department: 'Sales', category: 'Client Travel & Entertainment', allocatedAmount: 190000, period: currentMonthStr, notes: 'Enterprise client visits in Mumbai & Delhi' },
    { department: 'Sales', category: 'CRM & Lead Intelligence', allocatedAmount: 160000, period: currentMonthStr, notes: 'Salesforce CRM & ZoomInfo subscriptions' },
    { department: 'Sales', category: 'Sales Commissions & Incentives', allocatedAmount: 280000, period: currentMonthStr, notes: 'Q3 target overachievement payouts' },

    { department: 'Human Resources', category: 'Recruitment & Job Portals', allocatedAmount: 140000, period: currentMonthStr, notes: 'Naukri, LinkedIn Recruiter licenses' },
    { department: 'Human Resources', category: 'Employee Health & Benefits', allocatedAmount: 250000, period: currentMonthStr, notes: 'HDFC Ergo group medical health coverage' },
    { department: 'Human Resources', category: 'Team Offsites & Culture', allocatedAmount: 90000, period: currentMonthStr, notes: 'Monthly townhall snacks & employee recognition' },

    // Previous Month Budgets
    { department: 'Technology', category: 'Cloud Infrastructure & Servers', allocatedAmount: 420000, period: prevMonthStr },
    { department: 'Technology', category: 'Software Licenses & Tooling', allocatedAmount: 210000, period: prevMonthStr },
    { department: 'Marketing', category: 'Digital Ads & Performance', allocatedAmount: 350000, period: prevMonthStr },
    { department: 'Operations', category: 'Office Rent & Facilities', allocatedAmount: 350000, period: prevMonthStr },
    { department: 'Sales', category: 'Client Travel & Entertainment', allocatedAmount: 180000, period: prevMonthStr },
    { department: 'Human Resources', category: 'Employee Health & Benefits', allocatedAmount: 250000, period: prevMonthStr },
  ];

  // Helper to construct realistic dates in current and past month
  const makeDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  const transactions = [
    // Income Transactions
    {
      title: 'Enterprise SaaS Annual Contract - TechMahindra',
      amount: 1450000,
      type: 'income',
      category: 'Client Revenue',
      department: 'Sales',
      date: makeDate(3),
      paymentMethod: 'Bank Transfer',
      vendor: 'TechMahindra Ltd',
      description: 'Annual enterprise multi-seat cloud software contract renewal',
    },
    {
      title: 'Strategic Consulting Advisory Retainer',
      amount: 680000,
      type: 'income',
      category: 'Consulting Revenue',
      department: 'Sales',
      date: makeDate(14),
      paymentMethod: 'Bank Transfer',
      vendor: 'FinEdge Global Corp',
      description: 'Monthly cloud optimization and financial architecture advisory',
    },
    {
      title: 'SaaS Platform Tier 2 Subscriptions (Razorpay Payout)',
      amount: 520000,
      type: 'income',
      category: 'Subscription Revenue',
      department: 'Sales',
      date: makeDate(20),
      paymentMethod: 'Bank Transfer',
      vendor: 'Razorpay Payment Gateway',
      description: 'Direct recurring card subscriptions from mid-market customers',
    },

    // Technology Expenses (High spend, some near cap)
    {
      title: 'Amazon Web Services (AWS) Cloud Hosting Invoice',
      amount: 382400,
      type: 'expense',
      category: 'Cloud Infrastructure & Servers',
      department: 'Technology',
      date: makeDate(2),
      paymentMethod: 'Corporate Card',
      vendor: 'Amazon Web Services Inc',
      description: 'EC2 instances, Aurora PostgreSQL multi-AZ, and S3 data lake storage',
      isRecurring: true,
    },
    {
      title: 'Google Cloud Platform (GCP) AI & BigQuery Cluster',
      amount: 78500,
      type: 'expense',
      category: 'Cloud Infrastructure & Servers',
      department: 'Technology',
      date: makeDate(6),
      paymentMethod: 'Corporate Card',
      vendor: 'Google Cloud India',
      description: 'Data analytics warehouse queries and machine learning training pipeline',
      isRecurring: true,
    },
    {
      title: 'GitHub Enterprise Cloud Seats (35 Users)',
      amount: 62000,
      type: 'expense',
      category: 'Software Licenses & Tooling',
      department: 'Technology',
      date: makeDate(8),
      paymentMethod: 'Credit Card',
      vendor: 'GitHub / Microsoft',
      description: 'CI/CD runner minutes, GitHub Copilot seats and repo access',
      isRecurring: true,
    },
    {
      title: 'Datadog APM & Synthetic Monitoring Suite',
      amount: 84000,
      type: 'expense',
      category: 'Software Licenses & Tooling',
      department: 'Technology',
      date: makeDate(12),
      paymentMethod: 'Corporate Card',
      vendor: 'Datadog Inc',
      description: 'Application performance monitoring and distributed tracing',
      isRecurring: true,
    },
    {
      title: 'Apple MacBook Pro M3 (16GB, 512GB) for Sr. Backend Engineer',
      amount: 174900,
      type: 'expense',
      category: 'Hardware & Workstations',
      department: 'Technology',
      date: makeDate(16),
      paymentMethod: 'Bank Transfer',
      vendor: 'Imagine Tresor Retail',
      description: 'New workstation asset #NX-LAP-2026-08',
    },

    // Marketing Expenses
    {
      title: 'Google AdWords Search Campaign - FinTech Keywords',
      amount: 195000,
      type: 'expense',
      category: 'Digital Ads & Performance',
      department: 'Marketing',
      date: makeDate(4),
      paymentMethod: 'Credit Card',
      vendor: 'Google India Pvt Ltd',
      description: 'High-intent search ads targeting CFOs and Finance Directors',
    },
    {
      title: 'LinkedIn Sponsored Content & InMail Invoicing',
      amount: 142000,
      type: 'expense',
      category: 'Digital Ads & Performance',
      department: 'Marketing',
      date: makeDate(9),
      paymentMethod: 'Corporate Card',
      vendor: 'LinkedIn Ireland Unlimited',
      description: 'B2B executive lead generation campaigns across APAC',
    },
    {
      title: 'SaaS India Summit 2026 Gold Sponsorship Advance',
      amount: 150000,
      type: 'expense',
      category: 'Conferences & Sponsorships',
      department: 'Marketing',
      date: makeDate(18),
      paymentMethod: 'Bank Transfer',
      vendor: 'SaaSBOOMi Event Management',
      description: 'Exhibition booth booking and 4 delegate executive passes',
    },
    {
      title: 'Design Agency Retainer for Brand Collateral & UI Mockups',
      amount: 45000,
      type: 'expense',
      category: 'Content & Freelancers',
      department: 'Marketing',
      date: makeDate(22),
      paymentMethod: 'UPI',
      vendor: 'PixelCraft Creative Studio',
      description: 'Product launch infographics, pitch deck templates, and videos',
    },

    // Operations Expenses
    {
      title: 'WeWork Managed Dedicated Private Office Suite',
      amount: 350000,
      type: 'expense',
      category: 'Office Rent & Facilities',
      department: 'Operations',
      date: makeDate(1),
      paymentMethod: 'Bank Transfer',
      vendor: 'WeWork India Management',
      description: 'Monthly dedicated office lease for 45 workstations, utilities included',
      isRecurring: true,
    },
    {
      title: 'High-Speed Enterprise Leased Line (1 Gbps Dual Route)',
      amount: 38500,
      type: 'expense',
      category: 'Corporate Utilities & Internet',
      department: 'Operations',
      date: makeDate(11),
      paymentMethod: 'Bank Transfer',
      vendor: 'Tata Teleservices Ltd',
      description: 'Dedicated fiber link with 99.9% uptime SLA',
      isRecurring: true,
    },
    {
      title: 'Ernst & Young Transfer Pricing & Tax Filing Advisory',
      amount: 95000,
      type: 'expense',
      category: 'Legal & Accounting Audits',
      department: 'Operations',
      date: makeDate(19),
      paymentMethod: 'Bank Transfer',
      vendor: 'EY India LLP',
      description: 'Cross-border tax compliance and audited financial statement verification',
    },

    // Sales Expenses
    {
      title: 'Indigo Airline Flights & JW Marriott Stay (Delhi Enterprise Pitch)',
      amount: 68400,
      type: 'expense',
      category: 'Client Travel & Entertainment',
      department: 'Sales',
      date: makeDate(5),
      paymentMethod: 'Corporate Card',
      vendor: 'MakeMyTrip Corporate',
      description: 'Round-trip airfare and 2-night lodging for VP Sales and Solutions Architect',
    },
    {
      title: 'Salesforce Enterprise CRM License Subscription',
      amount: 145000,
      type: 'expense',
      category: 'CRM & Lead Intelligence',
      department: 'Sales',
      date: makeDate(13),
      paymentMethod: 'Credit Card',
      vendor: 'Salesforce.com Singapore',
      description: 'Sales Cloud 18 user licenses and Einstein AI lead scoring tier',
      isRecurring: true,
    },
    {
      title: 'Client Hospitality Dinner at The Leela Palace',
      amount: 24800,
      type: 'expense',
      category: 'Client Travel & Entertainment',
      department: 'Sales',
      date: makeDate(15),
      paymentMethod: 'Corporate Card',
      vendor: 'The Leela Palace Bengaluru',
      description: 'Closing dinner with Chief Information Officer of HDFC Securities',
    },

    // Human Resources Expenses
    {
      title: 'HDFC Ergo Group Health & Accident Insurance Premium',
      amount: 248000,
      type: 'expense',
      category: 'Employee Health & Benefits',
      department: 'Human Resources',
      date: makeDate(7),
      paymentMethod: 'Bank Transfer',
      vendor: 'HDFC ERGO General Insurance',
      description: 'Quarterly group medical floater policy for 75 team members & dependents',
      isRecurring: true,
    },
    {
      title: 'LinkedIn Recruiter Corporate 2-Seat License',
      amount: 72000,
      type: 'expense',
      category: 'Recruitment & Job Portals',
      department: 'Human Resources',
      date: makeDate(17),
      paymentMethod: 'Credit Card',
      vendor: 'LinkedIn Corporation',
      description: 'Annual corporate recruiter seat for engineering talent sourcing',
      isRecurring: true,
    },
    {
      title: 'Monthly All-Hands Townhall Refreshments & Awards',
      amount: 32500,
      type: 'expense',
      category: 'Team Offsites & Culture',
      department: 'Human Resources',
      date: makeDate(21),
      paymentMethod: 'UPI',
      vendor: 'Swiggy Gourmet Corporate',
      description: 'High-tea snacks and quarterly Star Performer recognition trophies',
    },
  ];

  const recommendations = [
    {
      title: 'Underutilized Cloud Hosting Reserve Instances',
      category: 'Cloud Infrastructure & Servers',
      department: 'Technology',
      currentAllocation: 450000,
      suggestedAllocation: 395000,
      estimatedSavings: 55000,
      reason: 'Analysis of AWS billing logs reveals 4 idle r6g.2xlarge staging instances running 24/7 over the weekend. Converting on-demand databases to 1-Year Savings Plans will yield ~12.2% monthly savings without downtime.',
      metrics: {
        currentSpend: 460900,
        utilizationRate: 102,
        momChangePercentage: 18,
        projectedRunRate: 485000,
        benchmark: 'AWS Well-Architected Cost Pillar',
      },
      priority: 'High',
      status: 'Pending',
    },
    {
      title: 'Consolidate Redundant Sourcing Software Licenses',
      category: 'Recruitment & Job Portals',
      department: 'Human Resources',
      currentAllocation: 140000,
      suggestedAllocation: 105000,
      estimatedSavings: 35000,
      reason: 'Active licenses exist for both Naukri Resdex enterprise and LinkedIn Recruiter with 40% overlapping candidate outreach. Sunsetting the underutilized Naukri tier reduces duplicate software expenditure.',
      metrics: {
        currentSpend: 72000,
        utilizationRate: 51,
        momChangePercentage: -5,
        projectedRunRate: 85000,
        benchmark: 'SaaS License Rationalization',
      },
      priority: 'Medium',
      status: 'Pending',
    },
    {
      title: 'Reallocate Unused Content Marketing Budget to Search Ads',
      category: 'Content & Freelancers',
      department: 'Marketing',
      currentAllocation: 110000,
      suggestedAllocation: 70000,
      estimatedSavings: 40000,
      reason: 'Content & Freelancer category currently operates at only 40.9% budget utilization. Reallocating ₹40,000 capital surplus into Google Search Ads will capture high-intent Q4 enterprise budget cycles.',
      metrics: {
        currentSpend: 45000,
        utilizationRate: 41,
        momChangePercentage: -15,
        projectedRunRate: 65000,
        benchmark: 'Surplus Capital Rebalancing',
      },
      priority: 'Low',
      status: 'Pending',
    },
  ];

  const notifications = [
    {
      title: 'Technology Budget Alert',
      message: 'Cloud Infrastructure has reached 102% of allocated budget (₹4,60,900 spent of ₹4,50,000 allocated). Immediate review required.',
      type: 'alert',
      isRead: false,
      link: '/budgets',
    },
    {
      title: 'New Smart Optimization Available',
      message: 'Optimization engine identified ₹55,000 potential monthly savings on AWS Cloud Infrastructure.',
      type: 'recommendation',
      isRead: false,
      link: '/optimization',
    },
    {
      title: 'Operations Budget on Track',
      message: 'Office Rent & Facilities budget utilization is currently healthy at 82% with all recurring vendor payments cleared.',
      type: 'info',
      isRead: true,
      link: '/budgets',
    },
  ];

  return {
    business,
    users,
    departments,
    budgets,
    transactions,
    recommendations,
    notifications,
  };
};

module.exports = { createSeedPayload };
