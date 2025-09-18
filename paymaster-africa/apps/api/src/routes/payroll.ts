import { Router } from 'express';
import { PrismaClient, PayrollStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { PayrollEngine } from '../services/payroll-engine';
import { payrollQueue } from '../queues';

const router = Router();
const prisma = new PrismaClient();
const payrollEngine = new PayrollEngine();

// Schema validation
const runPayrollSchema = z.object({
  periodId: z.string().uuid(),
});

const approvePayrollSchema = z.object({
  periodId: z.string().uuid(),
});

// Get all payroll periods
router.get('/periods', authenticate, async (req: AuthRequest, res) => {
  const { companyId, status } = req.query;

  const periods = await prisma.payrollPeriod.findMany({
    where: {
      ...(companyId && { companyId: companyId as string }),
      ...(status && { status: status as PayrollStatus }),
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
    include: {
      company: true,
      taxPack: true,
      _count: {
        select: { payslips: true },
      },
    },
    orderBy: { periodStart: 'desc' },
  });

  res.json(periods);
});

// Get single payroll period
router.get('/periods/:id', authenticate, async (req: AuthRequest, res) => {
  const period = await prisma.payrollPeriod.findFirst({
    where: {
      id: req.params.id,
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
    include: {
      company: true,
      taxPack: true,
      payslips: {
        include: {
          employee: true,
          lineItems: true,
        },
      },
    },
  });

  if (!period) {
    return res.status(404).json({ error: 'Payroll period not found' });
  }

  res.json(period);
});

// Create new payroll period
router.post('/periods', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN, UserRole.PAYROLL_OFFICER]), async (req: AuthRequest, res) => {
  const { companyId, periodStart, periodEnd } = req.body;

  // Verify company belongs to organization
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      organizationId: req.auth!.orgId!,
    },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Get active tax pack
  const taxPack = await prisma.taxPack.findFirst({
    where: {
      companyId,
      country: company.country,
      isActive: true,
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  if (!taxPack) {
    return res.status(400).json({ error: 'No active tax pack found for company' });
  }

  const period = await prisma.payrollPeriod.create({
    data: {
      companyId,
      taxPackId: taxPack.id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      status: PayrollStatus.DRAFT,
    },
  });

  res.status(201).json(period);
});

// Run payroll calculation
router.post('/periods/:id/run', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN, UserRole.PAYROLL_OFFICER]), async (req: AuthRequest, res) => {
  const { id } = req.params;

  // Verify period belongs to organization
  const period = await prisma.payrollPeriod.findFirst({
    where: {
      id,
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
    include: {
      company: true,
      taxPack: true,
    },
  });

  if (!period) {
    return res.status(404).json({ error: 'Payroll period not found' });
  }

  if (period.status !== PayrollStatus.DRAFT) {
    return res.status(400).json({ error: 'Payroll can only be run on draft periods' });
  }

  // Queue the payroll processing job
  await payrollQueue.add('process-payroll', {
    periodId: id,
    userId: req.auth!.userId,
    orgId: req.auth!.orgId,
  });

  // Update status to processing
  await prisma.payrollPeriod.update({
    where: { id },
    data: { status: PayrollStatus.PROCESSING },
  });

  res.json({ message: 'Payroll processing started', periodId: id });
});

// Approve payroll
router.post('/periods/:id/approve', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN]), async (req: AuthRequest, res) => {
  const { id } = req.params;

  const period = await prisma.payrollPeriod.findFirst({
    where: {
      id,
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
  });

  if (!period) {
    return res.status(404).json({ error: 'Payroll period not found' });
  }

  if (period.status !== PayrollStatus.LOCKED) {
    return res.status(400).json({ error: 'Payroll must be locked before approval' });
  }

  const updatedPeriod = await prisma.payrollPeriod.update({
    where: { id },
    data: {
      status: PayrollStatus.APPROVED,
      approvedBy: req.auth!.user.email,
      approvedAt: new Date(),
    },
  });

  res.json(updatedPeriod);
});

// Lock payroll for review
router.post('/periods/:id/lock', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN, UserRole.PAYROLL_OFFICER]), async (req: AuthRequest, res) => {
  const { id } = req.params;

  const period = await prisma.payrollPeriod.findFirst({
    where: {
      id,
      status: PayrollStatus.PROCESSED,
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
  });

  if (!period) {
    return res.status(404).json({ error: 'Processed payroll period not found' });
  }

  const updatedPeriod = await prisma.payrollPeriod.update({
    where: { id },
    data: { status: PayrollStatus.LOCKED },
  });

  res.json(updatedPeriod);
});

// Mark payroll as paid
router.post('/periods/:id/paid', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN]), async (req: AuthRequest, res) => {
  const { id } = req.params;

  const period = await prisma.payrollPeriod.findFirst({
    where: {
      id,
      status: PayrollStatus.APPROVED,
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
  });

  if (!period) {
    return res.status(404).json({ error: 'Approved payroll period not found' });
  }

  const updatedPeriod = await prisma.payrollPeriod.update({
    where: { id },
    data: {
      status: PayrollStatus.PAID,
      paidAt: new Date(),
    },
  });

  // Queue email notifications to employees
  const payslips = await prisma.payslip.findMany({
    where: { payrollPeriodId: id },
    include: { employee: true },
  });

  for (const payslip of payslips) {
    await emailQueue.add('send-payslip', {
      payslipId: payslip.id,
      employeeEmail: payslip.employee.email,
    });
  }

  res.json(updatedPeriod);
});

// Get payroll summary
router.get('/summary', authenticate, async (req: AuthRequest, res) => {
  const { companyId, year, month } = req.query;

  const summary = await prisma.payrollPeriod.aggregate({
    where: {
      ...(companyId && { companyId: companyId as string }),
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
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
    _sum: {
      totalGross: true,
      totalNet: true,
      totalPaye: true,
      totalDeductions: true,
      totalEmployerCost: true,
    },
    _count: true,
  });

  res.json(summary);
});

export default router;