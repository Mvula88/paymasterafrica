import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';
import { PDFGenerator } from './pdf-generator';
import { format } from 'date-fns';

const resend = new Resend(process.env.RESEND_API_KEY);
const prisma = new PrismaClient();
const pdfGenerator = new PDFGenerator();

export class EmailService {
  private from = 'PayMaster Africa <payroll@paymasterafrica.com>';

  async sendPayslip(payslipId: string, employeeEmail: string) {
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: true,
        payrollPeriod: {
          include: { company: true },
        },
        lineItems: true,
      },
    });

    if (!payslip) {
      throw new Error('Payslip not found');
    }

    // Generate PDF
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

    const periodString = `${format(payslip.payrollPeriod.periodStart, 'MMMM yyyy')}`;

    const { data, error } = await resend.emails.send({
      from: this.from,
      to: employeeEmail,
      subject: `Your Payslip for ${periodString}`,
      html: this.getPayslipEmailTemplate({
        employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
        companyName: payslip.payrollPeriod.company.name,
        period: periodString,
        netPay: payslip.netSalary,
        currency: payslip.payrollPeriod.company.country === 'NA' ? 'N$' : 'R',
      }),
      attachments: [
        {
          filename: `payslip_${periodString.toLowerCase().replace(' ', '_')}.pdf`,
          content: pdfBuffer.toString('base64'),
        },
      ],
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    // Update payslip with email sent timestamp
    await prisma.payslip.update({
      where: { id: payslipId },
      data: { emailedAt: new Date() },
    });

    return data;
  }

  async sendBulkPayslips(periodId: string) {
    const payslips = await prisma.payslip.findMany({
      where: { payrollPeriodId: periodId },
      include: { employee: true },
    });

    const results = [];
    for (const payslip of payslips) {
      try {
        const result = await this.sendPayslip(payslip.id, payslip.employee.email);
        results.push({ payslipId: payslip.id, success: true, result });
      } catch (error) {
        results.push({ payslipId: payslip.id, success: false, error: error.message });
      }
    }

    return results;
  }

  async sendNotification(to: string, subject: string, body: string) {
    const { data, error } = await resend.emails.send({
      from: this.from,
      to,
      subject,
      html: this.getNotificationEmailTemplate({ subject, body }),
    });

    if (error) {
      throw new Error(`Failed to send notification: ${error.message}`);
    }

    return data;
  }

  async sendPasswordReset(email: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const { data, error } = await resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Reset Your PayMaster Africa Password',
      html: this.getPasswordResetTemplate({ email, resetUrl }),
    });

    if (error) {
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }

    return data;
  }

  async sendWelcomeEmail(email: string, firstName: string, companyName: string) {
    const { data, error } = await resend.emails.send({
      from: this.from,
      to: email,
      subject: `Welcome to PayMaster Africa - ${companyName}`,
      html: this.getWelcomeEmailTemplate({ firstName, companyName }),
    });

    if (error) {
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }

    return data;
  }

  private getPayslipEmailTemplate(data: {
    employeeName: string;
    companyName: string;
    period: string;
    netPay: number;
    currency: string;
  }) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Payslip</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .amount { font-size: 24px; font-weight: bold; color: #059669; }
            .footer { margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>PayMaster Africa</h1>
              <p>Payslip Notification</p>
            </div>
            <div class="content">
              <h2>Hi ${data.employeeName},</h2>
              <p>Your payslip for <strong>${data.period}</strong> is now available.</p>

              <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #6b7280;">Net Pay</p>
                <p class="amount">${data.currency} ${data.netPay.toFixed(2)}</p>
              </div>

              <p>Please find your detailed payslip attached to this email as a PDF document.</p>

              <p>You can also access your payslip and other documents by logging into your employee portal:</p>

              <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/portal" class="button">Access Portal</a>
              </p>

              <p>If you have any questions about your payslip, please contact your HR department.</p>

              <p>Best regards,<br>${data.companyName} Payroll Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email from PayMaster Africa. Please do not reply to this email.</p>
              <p>© 2025 PayMaster Africa. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getNotificationEmailTemplate(data: { subject: string; body: string }) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${data.subject}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .footer { margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>PayMaster Africa</h1>
            </div>
            <div class="content">
              ${data.body}
            </div>
            <div class="footer">
              <p>© 2025 PayMaster Africa. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetTemplate(data: { email: string; resetUrl: string }) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; }
            .footer { margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>PayMaster Africa</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset the password for your account (${data.email}).</p>

              <p>Click the button below to reset your password:</p>

              <p style="text-align: center; margin: 30px 0;">
                <a href="${data.resetUrl}" class="button">Reset Password</a>
              </p>

              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #1e40af;">${data.resetUrl}</p>

              <p>This link will expire in 1 hour for security reasons.</p>

              <p>If you didn't request a password reset, you can safely ignore this email.</p>

              <p>Best regards,<br>PayMaster Africa Team</p>
            </div>
            <div class="footer">
              <p>© 2025 PayMaster Africa. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getWelcomeEmailTemplate(data: { firstName: string; companyName: string }) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to PayMaster Africa</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; }
            .feature { margin: 15px 0; padding: 15px; background: white; border-radius: 6px; }
            .footer { margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to PayMaster Africa!</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.firstName},</h2>
              <p>Welcome to ${data.companyName}'s payroll system powered by PayMaster Africa!</p>

              <p>Your employee account has been created. Here's what you can do with your account:</p>

              <div class="feature">
                <strong>📄 Access Payslips</strong>
                <p>View and download your monthly payslips anytime.</p>
              </div>

              <div class="feature">
                <strong>📊 Tax Documents</strong>
                <p>Access your PAYE5/IRP5 certificates and other tax documents.</p>
              </div>

              <div class="feature">
                <strong>🏖️ Leave Balances</strong>
                <p>Check your leave balances and history.</p>
              </div>

              <div class="feature">
                <strong>👤 Personal Information</strong>
                <p>Update your contact and banking details.</p>
              </div>

              <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/portal" class="button">Access Your Portal</a>
              </p>

              <p>If you have any questions, please contact your HR department.</p>

              <p>Best regards,<br>The PayMaster Africa Team</p>
            </div>
            <div class="footer">
              <p>© 2025 PayMaster Africa. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}