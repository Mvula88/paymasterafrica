import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const createEmployeeSchema = z.object({
  companyId: z.string().uuid(),
  employeeNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  nationalId: z.string(),
  taxNumber: z.string().optional(),
  hireDate: z.string().datetime(),
  basicSalary: z.number().positive(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankBranchCode: z.string().optional(),
});

// Get all employees
router.get('/', authenticate, async (req: AuthRequest, res) => {
  const { companyId, isActive } = req.query;

  const employees = await prisma.employee.findMany({
    where: {
      company: {
        organizationId: req.auth!.orgId!,
        ...(companyId && { id: companyId as string }),
      },
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    },
    include: {
      company: {
        select: {
          name: true,
          country: true,
        },
      },
      user: {
        select: {
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(employees);
});

// Get single employee
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id: req.params.id,
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
    include: {
      company: true,
      payslips: {
        orderBy: { createdAt: 'desc' },
        take: 12,
      },
      leaveBalances: {
        where: { year: new Date().getFullYear() },
      },
    },
  });

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  res.json(employee);
});

// Create employee
router.post('/', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN, UserRole.PAYROLL_OFFICER]), async (req: AuthRequest, res) => {
  const validatedData = createEmployeeSchema.parse(req.body);

  // Verify company belongs to organization
  const company = await prisma.company.findFirst({
    where: {
      id: validatedData.companyId,
      organizationId: req.auth!.orgId!,
    },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Check if employee number already exists
  const existing = await prisma.employee.findFirst({
    where: {
      companyId: validatedData.companyId,
      employeeNumber: validatedData.employeeNumber,
    },
  });

  if (existing) {
    return res.status(409).json({ error: 'Employee number already exists' });
  }

  const employee = await prisma.employee.create({
    data: {
      ...validatedData,
      hireDate: new Date(validatedData.hireDate),
      sscApplicable: company.country === 'NA',
      uifApplicable: company.country === 'ZA',
      sdlApplicable: company.country === 'ZA' && company.sdlApplicable,
    },
  });

  // Create default leave balances
  const currentYear = new Date().getFullYear();
  await prisma.leaveBalance.createMany({
    data: [
      {
        employeeId: employee.id,
        leaveType: 'ANNUAL',
        entitlement: 21,
        taken: 0,
        balance: 21,
        year: currentYear,
      },
      {
        employeeId: employee.id,
        leaveType: 'SICK',
        entitlement: 10,
        taken: 0,
        balance: 10,
        year: currentYear,
      },
    ],
  });

  res.status(201).json(employee);
});

// Update employee
router.put('/:id', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN, UserRole.PAYROLL_OFFICER]), async (req: AuthRequest, res) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id: req.params.id,
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
  });

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const updatedEmployee = await prisma.employee.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json(updatedEmployee);
});

// Deactivate employee
router.post('/:id/deactivate', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN]), async (req: AuthRequest, res) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id: req.params.id,
      company: {
        organizationId: req.auth!.orgId!,
      },
    },
  });

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const updatedEmployee = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      isActive: false,
      terminationDate: new Date(),
    },
  });

  res.json(updatedEmployee);
});

// Bulk import employees
router.post('/bulk-import', authenticate, requireRole([UserRole.OWNER, UserRole.ADMIN]), async (req: AuthRequest, res) => {
  const { companyId, employees } = req.body;

  // Verify company
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      organizationId: req.auth!.orgId!,
    },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const results = [];
  for (const emp of employees) {
    try {
      const employee = await prisma.employee.create({
        data: {
          ...emp,
          companyId,
          hireDate: new Date(emp.hireDate),
          sscApplicable: company.country === 'NA',
          uifApplicable: company.country === 'ZA',
        },
      });
      results.push({ success: true, employee });
    } catch (error) {
      results.push({ success: false, error: error.message, data: emp });
    }
  }

  res.json({ results });
});

export default router;