import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const createCompanySchema = z.object({
  name: z.string(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  country: z.enum(['NA', 'ZA']),
  payFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  vetLevyApplicable: z.boolean().optional(),
  sdlApplicable: z.boolean().optional(),
  uifApplicable: z.boolean().optional(),
});

// Get all companies
router.get('/', authenticate, async (req: AuthRequest, res) => {
  const companies = await prisma.company.findMany({
    where: {
      organizationId: req.auth!.orgId!,
    },
    include: {
      _count: {
        select: {
          employees: true,
          payrollPeriods: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(companies);
});

// Get single company
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const company = await prisma.company.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.auth!.orgId!,
    },
    include: {
      employees: {
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
        },
      },
      taxPacks: {
        where: { isActive: true },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
    },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  res.json(company);
});

// Create company
router.post('/', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN]), async (req: AuthRequest, res) => {
  const validatedData = createCompanySchema.parse(req.body);

  const company = await prisma.company.create({
    data: {
      ...validatedData,
      organizationId: req.auth!.orgId!,
    },
  });

  // Create default tax pack based on country
  const currentDate = new Date();
  const taxPackData = {
    companyId: company.id,
    country: company.country,
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    effectiveFrom: currentDate,
    isActive: true,
  };

  if (company.country === 'NA') {
    await prisma.taxPack.create({
      data: {
        ...taxPackData,
        payeBrackets: [
          { min: 0, max: 50000, rate: 0, fixedAmount: 0 },
          { min: 50001, max: 100000, rate: 0.18, fixedAmount: 0 },
          { min: 100001, max: 300000, rate: 0.25, fixedAmount: 9000 },
          { min: 300001, max: 500000, rate: 0.28, fixedAmount: 59000 },
          { min: 500001, max: 800000, rate: 0.30, fixedAmount: 115000 },
          { min: 800001, max: 1500000, rate: 0.32, fixedAmount: 205000 },
          { min: 1500001, max: 999999999, rate: 0.37, fixedAmount: 429000 },
        ],
        sscEmployeeRate: 0.009,
        sscEmployerRate: 0.009,
        sscMinCeiling: 500,
        sscMaxCeiling: 11000,
        vetLevyRate: 0.01,
      },
    });
  } else if (company.country === 'ZA') {
    await prisma.taxPack.create({
      data: {
        ...taxPackData,
        payeBrackets: [
          { min: 0, max: 237100, rate: 0.18, fixedAmount: 0 },
          { min: 237101, max: 370500, rate: 0.26, fixedAmount: 42678 },
          { min: 370501, max: 512800, rate: 0.31, fixedAmount: 77362 },
          { min: 512801, max: 673000, rate: 0.36, fixedAmount: 121475 },
          { min: 673001, max: 857900, rate: 0.39, fixedAmount: 179147 },
          { min: 857901, max: 1817000, rate: 0.41, fixedAmount: 251258 },
          { min: 1817001, max: 999999999, rate: 0.45, fixedAmount: 644489 },
        ],
        uifEmployeeRate: 0.01,
        uifEmployerRate: 0.01,
        uifMaxCeiling: 17712,
        sdlRate: 0.01,
      },
    });
  }

  res.status(201).json(company);
});

// Update company
router.put('/:id', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN]), async (req: AuthRequest, res) => {
  const company = await prisma.company.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.auth!.orgId!,
    },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const updatedCompany = await prisma.company.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json(updatedCompany);
});

// Delete company (soft delete)
router.delete('/:id', authenticate, requireRole([UserRole.OWNER]), async (req: AuthRequest, res) => {
  const company = await prisma.company.findFirst({
    where: {
      id: req.params.id,
      organizationId: req.auth!.orgId!,
    },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Check if company has employees
  const employeeCount = await prisma.employee.count({
    where: { companyId: req.params.id },
  });

  if (employeeCount > 0) {
    return res.status(400).json({
      error: 'Cannot delete company with active employees',
    });
  }

  await prisma.company.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Company deleted successfully' });
});

export default router;