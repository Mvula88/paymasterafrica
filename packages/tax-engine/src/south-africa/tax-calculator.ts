import Decimal from 'decimal.js';

export interface SouthAfricaTaxBracket {
  min: number;
  max: number;
  rate: number;
  fixedAmount: number;
}

export interface SouthAfricaTaxPack {
  year: number;
  month: number;
  payeBrackets: SouthAfricaTaxBracket[];
  primaryRebate: number;
  secondaryRebate: number; // Age 65+
  tertiaryRebate: number; // Age 75+
  uifEmployeeRate: number;
  uifEmployerRate: number;
  uifMaxCeiling: number;
  sdlRate: number;
}

export interface SouthAfricaPayrollInput {
  grossSalary: number;
  age?: number;
  uifApplicable?: boolean;
  sdlApplicable?: boolean;
  medicalAidMembers?: number;
  medicalAidAmount?: number;
  pension?: number;
  otherDeductions?: number;
}

export interface SouthAfricaPayrollResult {
  grossSalary: number;
  taxableIncome: number;
  paye: number;
  uifEmployee: number;
  uifEmployer: number;
  sdl: number;
  medicalAid: number;
  medicalAidTaxCredit: number;
  pension: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  totalEmployerCost: number;
}

// South Africa Tax Pack for 2025-03
export const SOUTH_AFRICA_TAX_PACK_2025_03: SouthAfricaTaxPack = {
  year: 2025,
  month: 3,
  payeBrackets: [
    { min: 0, max: 237100, rate: 0.18, fixedAmount: 0 },
    { min: 237101, max: 370500, rate: 0.26, fixedAmount: 42678 },
    { min: 370501, max: 512800, rate: 0.31, fixedAmount: 77362 },
    { min: 512801, max: 673000, rate: 0.36, fixedAmount: 121475 },
    { min: 673001, max: 857900, rate: 0.39, fixedAmount: 179147 },
    { min: 857901, max: 1817000, rate: 0.41, fixedAmount: 251258 },
    { min: 1817001, max: Infinity, rate: 0.45, fixedAmount: 644489 }
  ],
  primaryRebate: 17235, // Annual rebate
  secondaryRebate: 9444, // Additional for 65+
  tertiaryRebate: 3145, // Additional for 75+
  uifEmployeeRate: 0.01, // 1%
  uifEmployerRate: 0.01, // 1%
  uifMaxCeiling: 17712, // Monthly ceiling for UIF
  sdlRate: 0.01 // 1%
};

export class SouthAfricaTaxCalculator {
  constructor(private taxPack: SouthAfricaTaxPack = SOUTH_AFRICA_TAX_PACK_2025_03) {}

  calculateAnnualPAYE(annualTaxableIncome: number, age: number = 30): number {
    const income = new Decimal(annualTaxableIncome);

    let tax = new Decimal(0);
    for (const bracket of this.taxPack.payeBrackets) {
      if (income.gte(bracket.min) && income.lte(bracket.max)) {
        const taxableAmount = income.minus(bracket.min);
        tax = taxableAmount.mul(bracket.rate).plus(bracket.fixedAmount);
        break;
      }
    }

    // Apply rebates
    tax = tax.minus(this.taxPack.primaryRebate);
    if (age >= 65) {
      tax = tax.minus(this.taxPack.secondaryRebate);
    }
    if (age >= 75) {
      tax = tax.minus(this.taxPack.tertiaryRebate);
    }

    return tax.gt(0) ? tax.toNumber() : 0;
  }

  calculateMonthlyPAYE(monthlyTaxableIncome: number, age: number = 30): number {
    const annualTaxableIncome = new Decimal(monthlyTaxableIncome).mul(12);
    const annualTax = this.calculateAnnualPAYE(annualTaxableIncome.toNumber(), age);
    return new Decimal(annualTax).div(12).toNumber();
  }

  calculateMedicalAidTaxCredit(members: number = 0): number {
    // Medical aid tax credits for 2025
    const mainMemberCredit = 364;
    const dependantCredit = 246;

    if (members === 0) return 0;
    if (members === 1) return mainMemberCredit;

    const firstTwo = mainMemberCredit + dependantCredit;
    const additionalMembers = Math.max(0, members - 2);

    return firstTwo + (additionalMembers * dependantCredit);
  }

  calculateUIF(grossSalary: number, isEmployer: boolean = false): number {
    const salary = new Decimal(grossSalary);
    const rate = isEmployer ? this.taxPack.uifEmployerRate : this.taxPack.uifEmployeeRate;

    // Apply ceiling limit
    const cappedSalary = salary.gt(this.taxPack.uifMaxCeiling)
      ? new Decimal(this.taxPack.uifMaxCeiling)
      : salary;

    return cappedSalary.mul(rate).toNumber();
  }

  calculateSDL(totalPayroll: number): number {
    // SDL applies to companies with annual payroll > R500,000
    const annualPayroll = new Decimal(totalPayroll).mul(12);
    if (annualPayroll.gt(500000)) {
      return new Decimal(totalPayroll).mul(this.taxPack.sdlRate).toNumber();
    }
    return 0;
  }

  calculatePayroll(input: SouthAfricaPayrollInput): SouthAfricaPayrollResult {
    const gross = new Decimal(input.grossSalary);
    const pension = new Decimal(input.pension || 0);
    const medicalAidAmount = new Decimal(input.medicalAidAmount || 0);
    const otherDeductions = new Decimal(input.otherDeductions || 0);

    // Calculate medical aid tax credit
    const medicalAidTaxCredit = this.calculateMedicalAidTaxCredit(input.medicalAidMembers || 0);

    // Calculate taxable income
    // Pension is deductible up to certain limits (simplified here)
    const pensionDeduction = Decimal.min(pension, gross.mul(0.275)); // Max 27.5% of gross
    const taxableIncome = gross.minus(pensionDeduction);

    // Calculate PAYE (already accounting for medical tax credit internally)
    let paye = this.calculateMonthlyPAYE(taxableIncome.toNumber(), input.age || 30);
    paye = Math.max(0, paye - medicalAidTaxCredit);

    // Calculate UIF
    const uifEmployee = input.uifApplicable !== false
      ? this.calculateUIF(gross.toNumber(), false)
      : 0;
    const uifEmployer = input.uifApplicable !== false
      ? this.calculateUIF(gross.toNumber(), true)
      : 0;

    // Calculate SDL
    const sdl = input.sdlApplicable
      ? this.calculateSDL(gross.toNumber())
      : 0;

    // Calculate totals
    const totalDeductions = new Decimal(paye)
      .plus(uifEmployee)
      .plus(pension)
      .plus(medicalAidAmount)
      .plus(otherDeductions);

    const netSalary = gross.minus(totalDeductions);

    const totalEmployerCost = gross
      .plus(uifEmployer)
      .plus(sdl);

    return {
      grossSalary: gross.toNumber(),
      taxableIncome: taxableIncome.toNumber(),
      paye: paye,
      uifEmployee: uifEmployee,
      uifEmployer: uifEmployer,
      sdl: sdl,
      medicalAid: medicalAidAmount.toNumber(),
      medicalAidTaxCredit: medicalAidTaxCredit,
      pension: pension.toNumber(),
      otherDeductions: otherDeductions.toNumber(),
      totalDeductions: totalDeductions.toNumber(),
      netSalary: netSalary.toNumber(),
      totalEmployerCost: totalEmployerCost.toNumber()
    };
  }
}