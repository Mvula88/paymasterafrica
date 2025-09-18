import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { format } from 'date-fns';
import { Country } from '@prisma/client';

(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;

interface PayslipData {
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
    nationalId: string;
    taxNumber?: string;
    bankName?: string;
    bankAccountNumber?: string;
  };
  company: {
    name: string;
    registrationNumber?: string;
    taxNumber?: string;
    addressLine1?: string;
    city?: string;
    country: Country;
    logoUrl?: string;
  };
  period: {
    start: Date;
    end: Date;
  };
  earnings: {
    basic: number;
    overtime: number;
    bonuses: number;
    allowances: number;
    gross: number;
  };
  deductions: {
    paye: number;
    ssc?: number;
    uif?: number;
    medicalAid: number;
    pension: number;
    other: number;
    total: number;
  };
  employer: {
    ssc?: number;
    uif?: number;
    sdl?: number;
    vet?: number;
    total: number;
  };
  netPay: number;
}

export class PDFGenerator {
  generatePayslip(data: PayslipData): Buffer {
    const currencySymbol = data.company.country === Country.NA ? 'N$' : 'R';

    const documentDefinition: any = {
      content: [
        // Header with Company Info
        {
          columns: [
            {
              stack: [
                { text: data.company.name, style: 'companyName' },
                { text: data.company.addressLine1 || '', style: 'address' },
                { text: data.company.city || '', style: 'address' },
                { text: `Tax No: ${data.company.taxNumber || 'N/A'}`, style: 'address' },
              ],
              width: '*'
            },
            {
              stack: [
                { text: 'PAYSLIP', style: 'title', alignment: 'right' },
                {
                  text: `Period: ${format(data.period.start, 'dd MMM yyyy')} - ${format(data.period.end, 'dd MMM yyyy')}`,
                  style: 'period',
                  alignment: 'right'
                }
              ],
              width: 'auto'
            }
          ]
        },
        { text: ' ', margin: [0, 10] },

        // Employee Information
        {
          table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              [
                { text: 'Employee Name:', bold: true },
                { text: `${data.employee.firstName} ${data.employee.lastName}` },
                { text: 'Employee No:', bold: true },
                { text: data.employee.employeeNumber }
              ],
              [
                { text: 'ID Number:', bold: true },
                { text: data.employee.nationalId },
                { text: 'Tax Number:', bold: true },
                { text: data.employee.taxNumber || 'N/A' }
              ],
              [
                { text: 'Bank:', bold: true },
                { text: data.employee.bankName || 'N/A' },
                { text: 'Account:', bold: true },
                { text: data.employee.bankAccountNumber || 'N/A' }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 10]
        },

        { text: ' ', margin: [0, 10] },

        // Earnings Section
        {
          table: {
            widths: ['*', 100],
            headerRows: 1,
            body: [
              [
                { text: 'EARNINGS', style: 'tableHeader', colSpan: 2, alignment: 'center' },
                {}
              ],
              ['Basic Salary', { text: `${currencySymbol} ${this.formatAmount(data.earnings.basic)}`, alignment: 'right' }],
              ['Overtime', { text: `${currencySymbol} ${this.formatAmount(data.earnings.overtime)}`, alignment: 'right' }],
              ['Bonuses', { text: `${currencySymbol} ${this.formatAmount(data.earnings.bonuses)}`, alignment: 'right' }],
              ['Allowances', { text: `${currencySymbol} ${this.formatAmount(data.earnings.allowances)}`, alignment: 'right' }],
              [
                { text: 'Gross Salary', bold: true },
                { text: `${currencySymbol} ${this.formatAmount(data.earnings.gross)}`, alignment: 'right', bold: true }
              ]
            ]
          },
          margin: [0, 5]
        },

        { text: ' ', margin: [0, 10] },

        // Deductions Section
        {
          table: {
            widths: ['*', 100],
            headerRows: 1,
            body: [
              [
                { text: 'DEDUCTIONS', style: 'tableHeader', colSpan: 2, alignment: 'center' },
                {}
              ],
              ['PAYE', { text: `${currencySymbol} ${this.formatAmount(data.deductions.paye)}`, alignment: 'right' }],
              ...(data.deductions.ssc ?
                [['Social Security', { text: `${currencySymbol} ${this.formatAmount(data.deductions.ssc)}`, alignment: 'right' }]] :
                []),
              ...(data.deductions.uif ?
                [['UIF', { text: `${currencySymbol} ${this.formatAmount(data.deductions.uif)}`, alignment: 'right' }]] :
                []),
              ['Medical Aid', { text: `${currencySymbol} ${this.formatAmount(data.deductions.medicalAid)}`, alignment: 'right' }],
              ['Pension', { text: `${currencySymbol} ${this.formatAmount(data.deductions.pension)}`, alignment: 'right' }],
              ['Other Deductions', { text: `${currencySymbol} ${this.formatAmount(data.deductions.other)}`, alignment: 'right' }],
              [
                { text: 'Total Deductions', bold: true },
                { text: `${currencySymbol} ${this.formatAmount(data.deductions.total)}`, alignment: 'right', bold: true }
              ]
            ]
          },
          margin: [0, 5]
        },

        { text: ' ', margin: [0, 10] },

        // Net Pay
        {
          table: {
            widths: ['*', 150],
            body: [
              [
                { text: 'NET PAY', style: 'netPay', alignment: 'right' },
                { text: `${currencySymbol} ${this.formatAmount(data.netPay)}`, style: 'netPay', alignment: 'right' }
              ]
            ]
          },
          layout: 'noBorders'
        },

        { text: ' ', margin: [0, 10] },

        // Employer Contributions (if any)
        ...(data.employer.total > 0 ? [
          {
            table: {
              widths: ['*', 100],
              headerRows: 1,
              body: [
                [
                  { text: 'EMPLOYER CONTRIBUTIONS', style: 'tableHeader', colSpan: 2, alignment: 'center' },
                  {}
                ],
                ...(data.employer.ssc ?
                  [['Social Security (Employer)', { text: `${currencySymbol} ${this.formatAmount(data.employer.ssc)}`, alignment: 'right' }]] :
                  []),
                ...(data.employer.uif ?
                  [['UIF (Employer)', { text: `${currencySymbol} ${this.formatAmount(data.employer.uif)}`, alignment: 'right' }]] :
                  []),
                ...(data.employer.sdl ?
                  [['Skills Development Levy', { text: `${currencySymbol} ${this.formatAmount(data.employer.sdl)}`, alignment: 'right' }]] :
                  []),
                ...(data.employer.vet ?
                  [['VET Levy', { text: `${currencySymbol} ${this.formatAmount(data.employer.vet)}`, alignment: 'right' }]] :
                  []),
                [
                  { text: 'Total Employer Cost', bold: true },
                  { text: `${currencySymbol} ${this.formatAmount(data.employer.total)}`, alignment: 'right', bold: true }
                ]
              ]
            },
            margin: [0, 5]
          }
        ] : []),

        // Footer
        {
          text: [
            { text: 'Generated on: ', fontSize: 8, color: 'gray' },
            { text: format(new Date(), 'dd MMM yyyy HH:mm'), fontSize: 8, color: 'gray' }
          ],
          alignment: 'center',
          margin: [0, 30, 0, 0]
        }
      ],

      styles: {
        companyName: {
          fontSize: 18,
          bold: true,
          color: '#1e40af'
        },
        title: {
          fontSize: 20,
          bold: true,
          color: '#1e40af'
        },
        period: {
          fontSize: 10,
          color: 'gray'
        },
        address: {
          fontSize: 9,
          color: 'gray'
        },
        tableHeader: {
          bold: true,
          fontSize: 12,
          fillColor: '#f3f4f6'
        },
        netPay: {
          fontSize: 16,
          bold: true,
          color: '#059669'
        }
      },

      defaultStyle: {
        fontSize: 10,
        color: '#374151'
      }
    };

    const pdfDoc = pdfMake.createPdf(documentDefinition);
    return new Promise<Buffer>((resolve, reject) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        resolve(buffer);
      });
    });
  }

  generatePAYE5(data: any): Buffer {
    // PAYE5 Certificate for Namibia
    const documentDefinition: any = {
      content: [
        { text: 'REPUBLIC OF NAMIBIA', style: 'header', alignment: 'center' },
        { text: 'INLAND REVENUE', style: 'subheader', alignment: 'center' },
        { text: 'PAYE 5 CERTIFICATE', style: 'title', alignment: 'center' },
        { text: `Tax Year: ${data.taxYear}`, alignment: 'center', margin: [0, 10] },

        // Add certificate content based on Namibian requirements
        // This would be expanded with actual PAYE5 format
      ],

      styles: {
        header: { fontSize: 14, bold: true },
        subheader: { fontSize: 12, bold: true },
        title: { fontSize: 16, bold: true, margin: [0, 10] }
      }
    };

    const pdfDoc = pdfMake.createPdf(documentDefinition);
    return new Promise<Buffer>((resolve, reject) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        resolve(buffer);
      });
    });
  }

  generateIRP5(data: any): Buffer {
    // IRP5 Certificate for South Africa
    const documentDefinition: any = {
      content: [
        { text: 'SOUTH AFRICAN REVENUE SERVICE', style: 'header', alignment: 'center' },
        { text: 'IRP5 EMPLOYEE TAX CERTIFICATE', style: 'title', alignment: 'center' },
        { text: `Tax Year: ${data.taxYear}`, alignment: 'center', margin: [0, 10] },

        // Add certificate content based on SARS requirements
        // This would be expanded with actual IRP5 format
      ],

      styles: {
        header: { fontSize: 14, bold: true },
        title: { fontSize: 16, bold: true, margin: [0, 10] }
      }
    };

    const pdfDoc = pdfMake.createPdf(documentDefinition);
    return new Promise<Buffer>((resolve, reject) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        resolve(buffer);
      });
    });
  }

  private formatAmount(amount: number): string {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}