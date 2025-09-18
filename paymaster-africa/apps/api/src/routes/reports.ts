import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Payroll cost analysis
router.get('/payroll-cost', authenticate, async (req: AuthRequest, res) => {
  const { companyId, startDate, endDate } = req.query;

  const periods = await prisma.payrollPeriod.findMany({
    where: {
      company: {
        organizationId: req.auth!.orgId!,
        ...(companyId && { id: companyId as string }),
      },
      ...(startDate && {
        periodStart: {
          gte: new Date(startDate as string),
        },
      }),
      ...(endDate && {
        periodEnd: {
          lte: new Date(endDate as string),
        },
      }),
    },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      totalGross: true,
      totalNet: true,
      totalPaye: true,
      totalDeductions: true,
      totalEmployerCost: true,
      company: {
        select: {
          name: true,
          country: true,
        },
      },
    },
    orderBy: { periodStart: 'desc' },
  });

  res.json(periods);
});

// Tax liability summary
router.get('/tax-liability', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN]), async (req: AuthRequest, res) => {
  const { companyId, year, month } = req.query;

  const payslips = await prisma.payslip.groupBy({
    by: ['payrollPeriodId'],
    where: {
      payrollPeriod: {
        company: {
          organizationId: req.auth!.orgId!,
          ...(companyId && { id: companyId as string }),
        },
        ...(year && {
          periodStart: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${Number(year) + 1}-01-01`),
          },
        }),
        ...(month && {
          periodStart: {
            gte: new Date(`${year}-${month}-01`),
            lt: new Date(`${year}-${Number(month) + 1}-01`),
          },
        }),
      },
    },
    _sum: {
      paye: true,
      ssc: true,
      uif: true,
      employerSsc: true,
      employerUif: true,
      employerSdl: true,
      employerVet: true,
    },
  });

  res.json(payslips);
});

// Employee cost breakdown
router.get('/employee-costs', authenticate, async (req: AuthRequest, res) => {
  const { companyId, periodId } = req.query;

  const costs = await prisma.payslip.findMany({
    where: {
      ...(periodId && { payrollPeriodId: periodId as string }),
      payrollPeriod: {
        company: {
          organizationId: req.auth!.orgId!,
          ...(companyId && { id: companyId as string }),
        },
      },
    },
    select: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          employeeNumber: true,
        },
      },
      grossSalary: true,
      totalDeductions: true,
      netSalary: true,
      totalEmployerCost: true,
    },
  });

  res.json(costs);
});

// Compliance status
router.get('/compliance', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN]), async (req: AuthRequest, res) => {
  const { companyId } = req.query;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Get statutory returns status
  const returns = await prisma.statutoryReturn.findMany({
    where: {
      company: {
        organizationId: req.auth!.orgId!,
        ...(companyId && { id: companyId as string }),
      },
      year: currentYear,
    },
    select: {
      type: true,
      month: true,
      status: true,
      submittedAt: true,
      company: {
        select: {
          name: true,
          country: true,
        },
      },
    },
  });

  // Calculate compliance score
  const expectedReturns = currentMonth - 1; // Number of months completed
  const submittedReturns = returns.filter(r => r.status === 'SUBMITTED').length;
  const complianceScore = expectedReturns > 0
    ? (submittedReturns / expectedReturns) * 100
    : 100;

  res.json({
    complianceScore,
    currentYear,
    currentMonth,
    returns,
    summary: {
      expected: expectedReturns,
      submitted: submittedReturns,
      pending: expectedReturns - submittedReturns,
    },
  });
});

// Department summary
router.get('/department-summary', authenticate, async (req: AuthRequest, res) => {
  const { companyId } = req.query;

  // Mock department data - in production this would come from employee records
  const departments = [
    { name: 'Engineering', employees: 45, totalCost: 2850000 },
    { name: 'Sales', employees: 32, totalCost: 1920000 },
    { name: 'HR', employees: 12, totalCost: 540000 },
    { name: 'Finance', employees: 8, totalCost: 480000 },
    { name: 'Operations', employees: 23, totalCost: 1150000 },
  ];

  res.json(departments);
});

// General ledger export
router.get('/gl-export', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN]), async (req: AuthRequest, res) => {
  const { periodId } = req.query;

  const payslips = await prisma.payslip.findMany({
    where: {
      payrollPeriodId: periodId as string,
      payrollPeriod: {
        company: {
          organizationId: req.auth!.orgId!,
        },
      },
    },
    include: {
      lineItems: true,
      payrollPeriod: {
        include: {
          company: true,
        },
      },
    },
  });

  // Transform to GL format
  const glEntries = [];

  for (const payslip of payslips) {
    // Debit salary expense
    glEntries.push({
      date: payslip.payrollPeriod.periodEnd,
      account: '5000 - Salary Expense',
      debit: payslip.grossSalary,
      credit: 0,
      description: `Salary - ${payslip.employee}`,
    });

    // Credit PAYE payable
    if (payslip.paye > 0) {
      glEntries.push({
        date: payslip.payrollPeriod.periodEnd,
        account: '2100 - PAYE Payable',
        debit: 0,
        credit: payslip.paye,
        description: `PAYE - ${payslip.employee}`,
      });
    }

    // Credit Net Pay
    glEntries.push({
      date: payslip.payrollPeriod.periodEnd,
      account: '2200 - Wages Payable',
      debit: 0,
      credit: payslip.netSalary,
      description: `Net Pay - ${payslip.employee}`,
    });
  }

  res.json(glEntries);
});

// YTD summary
router.get('/ytd-summary', authenticate, async (req: AuthRequest, res) => {
  const { companyId } = req.query;
  const currentYear = new Date().getFullYear();

  const ytd = await prisma.payslip.aggregate({
    where: {
      payrollPeriod: {
        company: {
          organizationId: req.auth!.orgId!,
          ...(companyId && { id: companyId as string }),
        },
        periodStart: {
          gte: new Date(`${currentYear}-01-01`),
        },
      },
    },
    _sum: {
      grossSalary: true,
      netSalary: true,
      paye: true,
      totalDeductions: true,
      totalEmployerCost: true,
    },
    _count: {
      id: true,
    },
  });

  res.json(ytd);
});

export default router;