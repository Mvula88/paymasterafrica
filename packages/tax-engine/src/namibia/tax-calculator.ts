import Decimal from 'decimal.js';

export interface NamibiaTaxBracket {
  min: number;
  max: number;
  rate: number;
  fixedAmount: number;
}

export interface NamibiaTaxPack {
  year: number;
  month: number;
  payeBrackets: NamibiaTaxBracket[];
  sscEmployeeRate: number;
  sscEmployerRate: number;
  sscMinCeiling: number;
  sscMaxCeiling: number;
  vetLevyRate: number;
}

export interface NamibiaPayrollInput {
  grossSalary: number;
  sscApplicable?: boolean;
  vetLevyApplicable?: boolean;
  medicalAid?: number;
  pension?: number;
  otherDeductions?: number;
}

export interface NamibiaPayrollResult {
  grossSalary: number;
  taxableIncome: number;
  paye: number;
  sscEmployee: number;
  sscEmployer: number;
  vetLevy: number;
  medicalAid: number;
  pension: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  totalEmployerCost: number;
}

// Namibia Tax Pack for 2025-03
export const NAMIBIA_TAX_PACK_2025_03: NamibiaTaxPack = {
  year: 2025,
  month: 3,
  payeBrackets: [
    { min: 0, max: 50000, rate: 0, fixedAmount: 0 },
    { min: 50001, max: 100000, rate: 0.18, fixedAmount: 0 },
    { min: 100001, max: 300000, rate: 0.25, fixedAmount: 9000 },
    { min: 300001, max: 500000, rate: 0.28, fixedAmount: 59000 },
    { min: 500001, max: 800000, rate: 0.30, fixedAmount: 115000 },
    { min: 800001, max: 1500000, rate: 0.32, fixedAmount: 205000 },
    { min: 1500001, max: Infinity, rate: 0.37, fixedAmount: 429000 }
  ],
  sscEmployeeRate: 0.009, // 0.9%
  sscEmployerRate: 0.009, // 0.9%
  sscMinCeiling: 500,
  sscMaxCeiling: 11000,
  vetLevyRate: 0.01 // 1%
};

export class NamibiaTaxCalculator {
  constructor(private taxPack: NamibiaTaxPack = NAMIBIA_TAX_PACK_2025_03) {}

  calculateMonthlyPAYE(annualTaxableIncome: number): number {
    const income = new Decimal(annualTaxableIncome);

    for (const bracket of this.taxPack.payeBrackets) {
      if (income.gte(bracket.min) && income.lte(bracket.max)) {
        const taxableAmount = income.minus(bracket.min);
        const tax = taxableAmount.mul(bracket.rate).plus(bracket.fixedAmount);
        return tax.div(12).toNumber(); // Convert annual tax to monthly
      }
    }

    return 0;
  }

  calculateSSC(grossSalary: number, isEmployer: boolean = false): number {
    const salary = new Decimal(grossSalary);
    const rate = isEmployer ? this.taxPack.sscEmployerRate : this.taxPack.sscEmployeeRate;

    // Apply ceiling limits
    let cappedSalary = salary;
    if (salary.lt(this.taxPack.sscMinCeiling)) {
      cappedSalary = new Decimal(this.taxPack.sscMinCeiling);
    } else if (salary.gt(this.taxPack.sscMaxCeiling)) {
      cappedSalary = new Decimal(this.taxPack.sscMaxCeiling);
    }

    return cappedSalary.mul(rate).toNumber();
  }

  calculateVETLevy(totalPayroll: number): number {
    // VET Levy only applies if annual payroll >= N$1,000,000
    const annualPayroll = new Decimal(totalPayroll).mul(12);
    if (annualPayroll.gte(1000000)) {
      return new Decimal(totalPayroll).mul(this.taxPack.vetLevyRate).toNumber();
    }
    return 0;
  }

  calculatePayroll(input: NamibiaPayrollInput): NamibiaPayrollResult {
    const gross = new Decimal(input.grossSalary);
    const medicalAid = new Decimal(input.medicalAid || 0);
    const pension = new Decimal(input.pension || 0);
    const otherDeductions = new Decimal(input.otherDeductions || 0);

    // Calculate taxable income (gross minus pension and medical aid)
    const taxableIncome = gross.minus(pension).minus(medicalAid);

    // Calculate PAYE
    const annualTaxableIncome = taxableIncome.mul(12).toNumber();
    const paye = this.calculateMonthlyPAYE(annualTaxableIncome);

    // Calculate SSC
    const sscEmployee = input.sscApplicable !== false
      ? this.calculateSSC(gross.toNumber(), false)
      : 0;
    const sscEmployer = input.sscApplicable !== false
      ? this.calculateSSC(gross.toNumber(), true)
      : 0;

    // Calculate VET Levy
    const vetLevy = input.vetLevyApplicable
      ? this.calculateVETLevy(gross.toNumber())
      : 0;

    // Calculate totals
    const totalDeductions = new Decimal(paye)
      .plus(sscEmployee)
      .plus(medicalAid)
      .plus(pension)
      .plus(otherDeductions);

    const netSalary = gross.minus(totalDeductions);

    const totalEmployerCost = gross
      .plus(sscEmployer)
      .plus(vetLevy);

    return {
      grossSalary: gross.toNumber(),
      taxableIncome: taxableIncome.toNumber(),
      paye: paye,
      sscEmployee: sscEmployee,
      sscEmployer: sscEmployer,
      vetLevy: vetLevy,
      medicalAid: medicalAid.toNumber(),
      pension: pension.toNumber(),
      otherDeductions: otherDeductions.toNumber(),
      totalDeductions: totalDeductions.toNumber(),
      netSalary: netSalary.toNumber(),
      totalEmployerCost: totalEmployerCost.toNumber()
    };
  }
}