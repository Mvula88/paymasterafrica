import {
  NamibiaTaxCalculator,
  NamibiaPayrollInput,
  NamibiaPayrollResult,
  SouthAfricaTaxCalculator,
  SouthAfricaPayrollInput,
  SouthAfricaPayrollResult,
  NamibiaTaxPack,
  SouthAfricaTaxPack,
  NAMIBIA_TAX_PACK_2025_03,
  SOUTH_AFRICA_TAX_PACK_2025_03
} from '@paymaster/tax-engine';
import { Country } from '@prisma/client';

export interface PayrollCalculationInput {
  country: Country;
  grossSalary: number;
  age?: number;

  // Deductions
  medicalAid?: number;
  medicalAidMembers?: number;
  pension?: number;
  otherDeductions?: number;

  // Applicability flags
  sscApplicable?: boolean; // Namibia
  uifApplicable?: boolean; // South Africa
  sdlApplicable?: boolean; // South Africa
  vetLevyApplicable?: boolean; // Namibia

  // Custom tax pack (optional)
  taxPack?: NamibiaTaxPack | SouthAfricaTaxPack;
}

export interface PayrollCalculationResult {
  country: Country;
  grossSalary: number;
  taxableIncome: number;

  // Taxes & Statutory
  paye: number;
  sscEmployee?: number; // Namibia
  sscEmployer?: number; // Namibia
  uifEmployee?: number; // South Africa
  uifEmployer?: number; // South Africa
  sdl?: number; // South Africa
  vetLevy?: number; // Namibia

  // Deductions
  medicalAid: number;
  medicalAidTaxCredit?: number; // South Africa
  pension: number;
  otherDeductions: number;
  totalDeductions: number;

  // Final amounts
  netSalary: number;
  totalEmployerCost: number;

  // Line items for payslip
  lineItems: PayslipLineItem[];
}

export interface PayslipLineItem {
  type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
  code: string;
  description: string;
  amount: number;
  quantity?: number;
  rate?: number;
}

export class PayrollEngine {
  private namibiaTaxCalculator: NamibiaTaxCalculator;
  private southAfricaTaxCalculator: SouthAfricaTaxCalculator;

  constructor() {
    this.namibiaTaxCalculator = new NamibiaTaxCalculator();
    this.southAfricaTaxCalculator = new SouthAfricaTaxCalculator();
  }

  calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
    if (input.country === Country.NA) {
      return this.calculateNamibiaPayroll(input);
    } else if (input.country === Country.ZA) {
      return this.calculateSouthAfricaPayroll(input);
    } else {
      throw new Error(`Unsupported country: ${input.country}`);
    }
  }

  private calculateNamibiaPayroll(input: PayrollCalculationInput): PayrollCalculationResult {
    const namibiaInput: NamibiaPayrollInput = {
      grossSalary: input.grossSalary,
      sscApplicable: input.sscApplicable,
      vetLevyApplicable: input.vetLevyApplicable,
      medicalAid: input.medicalAid,
      pension: input.pension,
      otherDeductions: input.otherDeductions
    };

    const result = this.namibiaTaxCalculator.calculatePayroll(namibiaInput);

    // Build line items
    const lineItems: PayslipLineItem[] = [
      {
        type: 'EARNING',
        code: 'BASIC',
        description: 'Basic Salary',
        amount: result.grossSalary
      }
    ];

    // Add deductions
    if (result.paye > 0) {
      lineItems.push({
        type: 'DEDUCTION',
        code: 'PAYE',
        description: 'Pay As You Earn Tax',
        amount: result.paye
      });
    }

    if (result.sscEmployee > 0) {
      lineItems.push({
        type: 'DEDUCTION',
        code: 'SSC_EE',
        description: 'Social Security (Employee)',
        amount: result.sscEmployee
      });
    }

    if (result.medicalAid > 0) {
      lineItems.push({
        type: 'DEDUCTION',
        code: 'MED_AID',
        description: 'Medical Aid',
        amount: result.medicalAid
      });
    }

    if (result.pension > 0) {
      lineItems.push({
        type: 'DEDUCTION',
        code: 'PENSION',
        description: 'Pension Fund',
        amount: result.pension
      });
    }

    // Add employer contributions
    if (result.sscEmployer > 0) {
      lineItems.push({
        type: 'EMPLOYER_CONTRIBUTION',
        code: 'SSC_ER',
        description: 'Social Security (Employer)',
        amount: result.sscEmployer
      });
    }

    if (result.vetLevy > 0) {
      lineItems.push({
        type: 'EMPLOYER_CONTRIBUTION',
        code: 'VET',
        description: 'VET Levy',
        amount: result.vetLevy
      });
    }

    return {
      country: Country.NA,
      grossSalary: result.grossSalary,
      taxableIncome: result.taxableIncome,
      paye: result.paye,
      sscEmployee: result.sscEmployee,
      sscEmployer: result.sscEmployer,
      vetLevy: result.vetLevy,
      medicalAid: result.medicalAid,
      pension: result.pension,
      otherDeductions: result.otherDeductions,
      totalDeductions: result.totalDeductions,
      netSalary: result.netSalary,
      totalEmployerCost: result.totalEmployerCost,
      lineItems
    };
  }

  private calculateSouthAfricaPayroll(input: PayrollCalculationInput): PayrollCalculationResult {
    const saInput: SouthAfricaPayrollInput = {
      grossSalary: input.grossSalary,
      age: input.age,
      uifApplicable: input.uifApplicable,
      sdlApplicable: input.sdlApplicable,
      medicalAidMembers: input.medicalAidMembers,
      medicalAidAmount: input.medicalAid,
      pension: input.pension,
      otherDeductions: input.otherDeductions
    };

    const result = this.southAfricaTaxCalculator.calculatePayroll(saInput);

    // Build line items
    const lineItems: PayslipLineItem[] = [
      {
        type: 'EARNING',
        code: 'BASIC',
        description: 'Basic Salary',
        amount: result.grossSalary
      }
    ];

    // Add deductions
    if (result.paye > 0) {
      lineItems.push({
        type: 'DEDUCTION',
        code: 'PAYE',
        description: 'Pay As You Earn Tax',
        amount: result.paye
      });
    }

    if (result.uifEmployee > 0) {
      lineItems.push({
        type: 'DEDUCTION',
        code: 'UIF_EE',
        description: 'UIF (Employee)',
        amount: result.uifEmployee
      });
    }

    if (result.medicalAid > 0) {
      lineItems.push({
        type: 'DEDUCTION',
        code: 'MED_AID',
        description: 'Medical Aid',
        amount: result.medicalAid
      });
    }

    if (result.pension > 0) {
      lineItems.push({
        type: 'DEDUCTION',
        code: 'PENSION',
        description: 'Pension Fund',
        amount: result.pension
      });
    }

    // Add employer contributions
    if (result.uifEmployer > 0) {
      lineItems.push({
        type: 'EMPLOYER_CONTRIBUTION',
        code: 'UIF_ER',
        description: 'UIF (Employer)',
        amount: result.uifEmployer
      });
    }

    if (result.sdl > 0) {
      lineItems.push({
        type: 'EMPLOYER_CONTRIBUTION',
        code: 'SDL',
        description: 'Skills Development Levy',
        amount: result.sdl
      });
    }

    return {
      country: Country.ZA,
      grossSalary: result.grossSalary,
      taxableIncome: result.taxableIncome,
      paye: result.paye,
      uifEmployee: result.uifEmployee,
      uifEmployer: result.uifEmployer,
      sdl: result.sdl,
      medicalAid: result.medicalAid,
      medicalAidTaxCredit: result.medicalAidTaxCredit,
      pension: result.pension,
      otherDeductions: result.otherDeductions,
      totalDeductions: result.totalDeductions,
      netSalary: result.netSalary,
      totalEmployerCost: result.totalEmployerCost,
      lineItems
    };
  }

  async processPayrollPeriod(
    periodId: string,
    employees: any[],
    taxPack: any,
    country: Country
  ): Promise<any[]> {
    const payslips = [];

    for (const employee of employees) {
      const calculation = this.calculatePayroll({
        country,
        grossSalary: employee.basicSalary,
        age: this.calculateAge(employee.dateOfBirth),
        medicalAid: employee.medicalAid || 0,
        pension: employee.pension || 0,
        sscApplicable: employee.sscApplicable,
        uifApplicable: employee.uifApplicable,
        sdlApplicable: employee.sdlApplicable,
        vetLevyApplicable: employee.company?.vetLevyApplicable
      });

      payslips.push({
        employeeId: employee.id,
        payrollPeriodId: periodId,
        ...calculation
      });
    }

    return payslips;
  }

  private calculateAge(dateOfBirth?: Date | string): number {
    if (!dateOfBirth) return 30; // Default age

    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return age;
  }
}