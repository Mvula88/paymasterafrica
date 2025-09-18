import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient, PayrollStatus } from '@prisma/client';
import { PayrollEngine } from '../services/payroll-engine';
import { PDFGenerator } from '../services/pdf-generator';
import { EmailService } from '../services/email-service';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const prisma = new PrismaClient();
const payrollEngine = new PayrollEngine();
const pdfGenerator = new PDFGenerator();
const emailService = new EmailService();

// Create queues
export const payrollQueue = new Queue('payroll', { connection });
export const emailQueue = new Queue('email', { connection });
export const documentQueue = new Queue('documents', { connection });

// Payroll worker
const payrollWorker = new Worker(
  'payroll',
  async (job) => {
    const { periodId, userId, orgId } = job.data;

    try {
      // Get period with all related data
      const period = await prisma.payrollPeriod.findUnique({
        where: { id: periodId },
        include: {
          company: true,
          taxPack: true,
        },
      });

      if (!period) {
        throw new Error('Payroll period not found');
      }

      // Get all active employees for the company
      const employees = await prisma.employee.findMany({
        where: {
          companyId: period.companyId,
          isActive: true,
        },
      });

      // Process payroll for each employee
      let totalGross = 0;
      let totalNet = 0;
      let totalPaye = 0;
      let totalDeductions = 0;
      let totalEmployerCost = 0;

      for (const employee of employees) {
        const calculation = payrollEngine.calculatePayroll({
          country: period.company.country,
          grossSalary: employee.basicSalary,
          sscApplicable: employee.sscApplicable,
          uifApplicable: employee.uifApplicable,
          sdlApplicable: employee.sdlApplicable,
          vetLevyApplicable: period.company.vetLevyApplicable,
        });

        // Create payslip
        const payslip = await prisma.payslip.create({
          data: {
            payrollPeriodId: periodId,
            employeeId: employee.id,
            basicSalary: calculation.grossSalary,
            overtime: 0,
            bonuses: 0,
            allowances: 0,
            grossSalary: calculation.grossSalary,
            taxableIncome: calculation.taxableIncome,
            paye: calculation.paye,
            ssc: calculation.sscEmployee || 0,
            uif: calculation.uifEmployee || 0,
            medicalAid: calculation.medicalAid,
            pension: calculation.pension,
            otherDeductions: calculation.otherDeductions,
            totalDeductions: calculation.totalDeductions,
            employerSsc: calculation.sscEmployer || 0,
            employerUif: calculation.uifEmployer || 0,
            employerSdl: calculation.sdl || 0,
            employerVet: calculation.vetLevy || 0,
            totalEmployerCost: calculation.totalEmployerCost,
            netSalary: calculation.netSalary,
          },
        });

        // Create line items
        for (const lineItem of calculation.lineItems) {
          await prisma.lineItem.create({
            data: {
              payslipId: payslip.id,
              type: lineItem.type,
              code: lineItem.code,
              description: lineItem.description,
              amount: lineItem.amount,
              quantity: lineItem.quantity || 1,
              rate: lineItem.rate,
            },
          });
        }

        // Update totals
        totalGross += calculation.grossSalary;
        totalNet += calculation.netSalary;
        totalPaye += calculation.paye;
        totalDeductions += calculation.totalDeductions;
        totalEmployerCost += calculation.totalEmployerCost;
      }

      // Update period totals
      await prisma.payrollPeriod.update({
        where: { id: periodId },
        data: {
          totalGross,
          totalNet,
          totalPaye,
          totalDeductions,
          totalEmployerCost,
          status: PayrollStatus.PROCESSED,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PAYROLL_PROCESSED',
          entityType: 'PayrollPeriod',
          entityId: periodId,
          metadata: {
            employeeCount: employees.length,
            totalGross,
            totalNet,
          },
        },
      });

      return { success: true, periodId, employeesProcessed: employees.length };
    } catch (error) {
      // Update status to failed
      await prisma.payrollPeriod.update({
        where: { id: periodId },
        data: { status: PayrollStatus.DRAFT },
      });

      throw error;
    }
  },
  { connection }
);

// Email worker
const emailWorker = new Worker(
  'email',
  async (job) => {
    const { type, data } = job.data;

    switch (type) {
      case 'send-payslip':
        await emailService.sendPayslip(data.payslipId, data.employeeEmail);
        break;

      case 'send-bulk-payslips':
        await emailService.sendBulkPayslips(data.periodId);
        break;

      case 'send-notification':
        await emailService.sendNotification(data.to, data.subject, data.body);
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    return { success: true, type };
  },
  { connection }
);

// Document generation worker
const documentWorker = new Worker(
  'documents',
  async (job) => {
    const { type, data } = job.data;

    switch (type) {
      case 'generate-payslip':
        const payslip = await prisma.payslip.findUnique({
          where: { id: data.payslipId },
          include: {
            employee: true,
            payrollPeriod: {
              include: { company: true },
            },
          },
        });

        if (!payslip) {
          throw new Error('Payslip not found');
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

        // Save PDF to storage (implement storage service)
        // const pdfUrl = await storageService.uploadPayslip(pdfBuffer, payslip.id);

        // Update payslip with PDF URL
        // await prisma.payslip.update({
        //   where: { id: data.payslipId },
        //   data: { pdfUrl },
        // });

        return { success: true, payslipId: data.payslipId };

      case 'generate-paye5':
        // Generate PAYE5 for Namibia
        break;

      case 'generate-irp5':
        // Generate IRP5 for South Africa
        break;

      default:
        throw new Error(`Unknown document type: ${type}`);
    }
  },
  { connection }
);

// Queue event listeners
const payrollQueueEvents = new QueueEvents('payroll', { connection });

payrollQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Payroll job ${jobId} completed:`, returnvalue);
});

payrollQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Payroll job ${jobId} failed:`, failedReason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await payrollWorker.close();
  await emailWorker.close();
  await documentWorker.close();
  await connection.quit();
});