import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get employee portal data
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const employee = await prisma.employee.findFirst({
    where: {
      userId: req.auth!.userId,
    },
    include: {
      company: {
        select: {
          name: true,
          country: true,
        },
      },
      leaveBalances: {
        where: { year: new Date().getFullYear() },
      },
    },
  });

  if (!employee) {
    return res.status(404).json({ error: 'Employee profile not found' });
  }

  res.json(employee);
});

// Get employee payslips
router.get('/payslips', authenticate, async (req: AuthRequest, res) => {
  const employee = await prisma.employee.findFirst({
    where: { userId: req.auth!.userId },
  });

  if (!employee) {
    return res.status(404).json({ error: 'Employee profile not found' });
  }

  const payslips = await prisma.payslip.findMany({
    where: { employeeId: employee.id },
    include: {
      payrollPeriod: {
        select: {
          periodStart: true,
          periodEnd: true,
          status: true,
          company: {
            select: {
              name: true,
              country: true,
            },
          },
        },
      },
    },
    orderBy: {
      payrollPeriod: {
        periodStart: 'desc',
      },
    },
  });

  res.json(payslips);
});

// Get single payslip
router.get('/payslips/:id', authenticate, async (req: AuthRequest, res) => {
  const employee = await prisma.employee.findFirst({
    where: { userId: req.auth!.userId },
  });

  if (!employee) {
    return res.status(404).json({ error: 'Employee profile not found' });
  }

  const payslip = await prisma.payslip.findFirst({
    where: {
      id: req.params.id,
      employeeId: employee.id,
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

  if (!payslip) {
    return res.status(404).json({ error: 'Payslip not found' });
  }

  // Mark as viewed
  await prisma.payslip.update({
    where: { id: req.params.id },
    data: { viewedAt: new Date() },
  });

  res.json(payslip);
});

// Get employee documents
router.get('/documents', authenticate, async (req: AuthRequest, res) => {
  const employee = await prisma.employee.findFirst({
    where: { userId: req.auth!.userId },
    include: { company: true },
  });

  if (!employee) {
    return res.status(404).json({ error: 'Employee profile not found' });
  }

  // Get PAYE5/IRP5 certificates
  const documents = await prisma.statutoryReturn.findMany({
    where: {
      companyId: employee.companyId,
      type: {
        in: employee.company.country === 'NA' ? ['PAYE5'] : ['IRP5', 'IT3A'],
      },
    },
    orderBy: { year: 'desc' },
  });

  res.json(documents);
});

// Get leave balances
router.get('/leave-balances', authenticate, async (req: AuthRequest, res) => {
  const employee = await prisma.employee.findFirst({
    where: { userId: req.auth!.userId },
  });

  if (!employee) {
    return res.status(404).json({ error: 'Employee profile not found' });
  }

  const currentYear = new Date().getFullYear();
  const balances = await prisma.leaveBalance.findMany({
    where: {
      employeeId: employee.id,
      year: currentYear,
    },
  });

  res.json(balances);
});

// Update employee profile
router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  const employee = await prisma.employee.findFirst({
    where: { userId: req.auth!.userId },
  });

  if (!employee) {
    return res.status(404).json({ error: 'Employee profile not found' });
  }

  // Only allow updating certain fields
  const allowedFields = [
    'phone',
    'bankName',
    'bankAccountNumber',
    'bankBranchCode',
    'bankAccountType',
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  const updatedEmployee = await prisma.employee.update({
    where: { id: employee.id },
    data: updateData,
  });

  res.json(updatedEmployee);
});

// Get YTD earnings
router.get('/earnings/ytd', authenticate, async (req: AuthRequest, res) => {
  const employee = await prisma.employee.findFirst({
    where: { userId: req.auth!.userId },
  });

  if (!employee) {
    return res.status(404).json({ error: 'Employee profile not found' });
  }

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  const ytdSummary = await prisma.payslip.aggregate({
    where: {
      employeeId: employee.id,
      payrollPeriod: {
        periodStart: { gte: startOfYear },
      },
    },
    _sum: {
      grossSalary: true,
      netSalary: true,
      paye: true,
      totalDeductions: true,
    },
    _count: true,
  });

  res.json(ytdSummary);
});

export default router;