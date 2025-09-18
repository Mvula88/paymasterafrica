import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PDFGenerator } from '../services/pdf-generator';
import { documentQueue } from '../queues';

const router = Router();
const prisma = new PrismaClient();
const pdfGenerator = new PDFGenerator();

// Get payslip PDF
router.get('/payslips/:id.pdf', authenticate, async (req: AuthRequest, res) => {
  const payslip = await prisma.payslip.findFirst({
    where: {
      id: req.params.id.replace('.pdf', ''),
      employee: {
        company: {
          organizationId: req.auth!.orgId!,
        },
      },
    },
    include: {
      employee: true,
      payrollPeriod: {
        include: { company: true },
      },
    },
  });

  if (!payslip) {
    return res.status(404).json({ error: 'Payslip not found' });
  }

  const pdfBuffer = await pdfGenerator.generatePayslip({
    employee: payslip.employee,
    company: payslip.payrollPeriod.company,
    period: {
      start: payslip.payrollPeriod.periodStart,
      end: payslip.payrollPeriod.periodEnd,
    },
    earnings: {
      basic: payslip.basicSalary,
      overtime: payslip.overtime,
      bonuses: payslip.bonuses,
      allowances: payslip.allowances,
      gross: payslip.grossSalary,
    },
    deductions: {
      paye: payslip.paye,
      ssc: payslip.ssc,
      uif: payslip.uif,
      medicalAid: payslip.medicalAid,
      pension: payslip.pension,
      other: payslip.otherDeductions,
      total: payslip.totalDeductions,
    },
    employer: {
      ssc: payslip.employerSsc,
      uif: payslip.employerUif,
      sdl: payslip.employerSdl,
      vet: payslip.employerVet,
      total: payslip.totalEmployerCost,
    },
    netPay: payslip.netSalary,
  });

  res.contentType('application/pdf');
  res.send(pdfBuffer);
});

// Generate statutory returns
router.post('/returns/:country/:type/export', authenticate, async (req: AuthRequest, res) => {
  const { country, type } = req.params;
  const { year, month, companyId } = req.body;

  // Verify company
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      organizationId: req.auth!.orgId!,
      country: country as any,
    },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Queue document generation
  await documentQueue.add(`generate-${type.toLowerCase()}`, {
    companyId,
    country,
    type,
    year,
    month,
    userId: req.auth!.userId,
  });

  res.json({ message: 'Document generation queued', type, country });
});

// Get company documents
router.get('/company/:companyId', authenticate, async (req: AuthRequest, res) => {
  const documents = await prisma.statutoryReturn.findMany({
    where: {
      companyId: req.params.companyId,
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(documents);
});

// Bulk generate payslips
router.post('/payslips/bulk-generate', authenticate, async (req: AuthRequest, res) => {
  const { periodId } = req.body;

  const period = await prisma.payrollPeriod.findFirst({
    where: {
      id: periodId,
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
  });

  if (!period) {
    return res.status(404).json({ error: 'Payroll period not found' });
  }

  const payslips = await prisma.payslip.findMany({
    where: { payrollPeriodId: periodId },
  });

  for (const payslip of payslips) {
    await documentQueue.add('generate-payslip', {
      payslipId: payslip.id,
    });
  }

  res.json({
    message: 'Payslip generation queued',
    count: payslips.length,
  });
});

export default router;