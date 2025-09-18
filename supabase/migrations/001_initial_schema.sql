-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE country AS ENUM ('NA', 'ZA');
CREATE TYPE pay_frequency AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');
CREATE TYPE payroll_status AS ENUM ('DRAFT', 'LOCKED', 'APPROVED', 'PROCESSING', 'PROCESSED', 'PAID', 'CANCELLED');
CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'PAYROLL_OFFICER', 'EMPLOYEE');
CREATE TYPE document_type AS ENUM ('PAYSLIP', 'PAYE5', 'IRP5', 'IT3A', 'EMP201', 'EMP501', 'SSC_RETURN', 'UIF_RETURN', 'SDL_RETURN', 'VET_RETURN');

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_org_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role user_role DEFAULT 'EMPLOYEE',
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  tax_number VARCHAR(100),
  country country NOT NULL,
  pay_frequency pay_frequency DEFAULT 'MONTHLY',

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),

  -- Settings
  vet_levy_applicable BOOLEAN DEFAULT FALSE,
  sdl_applicable BOOLEAN DEFAULT FALSE,
  uif_applicable BOOLEAN DEFAULT TRUE,

  -- Branding
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#1e40af',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_companies_organization ON companies(organization_id);

-- Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID UNIQUE REFERENCES users(id),

  -- Personal Info
  employee_number VARCHAR(50) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  -- ID & Tax
  national_id VARCHAR(100) NOT NULL,
  tax_number VARCHAR(100),

  -- Employment
  hire_date DATE NOT NULL,
  termination_date DATE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Banking
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_branch_code VARCHAR(20),
  bank_account_type VARCHAR(50),

  -- Payroll Settings
  basic_salary DECIMAL(15,2) NOT NULL,
  hourly_salary DECIMAL(15,2),

  -- Tax Settings
  ssc_applicable BOOLEAN DEFAULT TRUE,
  uif_applicable BOOLEAN DEFAULT TRUE,
  sdl_applicable BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(company_id, employee_number)
);

CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_user ON employees(user_id);

-- Tax Packs table
CREATE TABLE tax_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  country country NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,

  -- Tax brackets as JSONB
  paye_brackets JSONB NOT NULL,

  -- Namibia specific
  ssc_employee_rate DECIMAL(5,4),
  ssc_employer_rate DECIMAL(5,4),
  ssc_min_ceiling DECIMAL(15,2),
  ssc_max_ceiling DECIMAL(15,2),
  vet_levy_rate DECIMAL(5,4),

  -- South Africa specific
  uif_employee_rate DECIMAL(5,4),
  uif_employer_rate DECIMAL(5,4),
  uif_max_ceiling DECIMAL(15,2),
  sdl_rate DECIMAL(5,4),

  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(company_id, country, year, month)
);

CREATE INDEX idx_tax_packs_company ON tax_packs(company_id);
CREATE INDEX idx_tax_packs_lookup ON tax_packs(country, year, month);

-- Payroll Periods table
CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  tax_pack_id UUID NOT NULL REFERENCES tax_packs(id),

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status payroll_status DEFAULT 'DRAFT',

  exchange_rate DECIMAL(10,6) DEFAULT 1.0,

  -- Summary
  total_gross DECIMAL(15,2) DEFAULT 0,
  total_net DECIMAL(15,2) DEFAULT 0,
  total_paye DECIMAL(15,2) DEFAULT 0,
  total_deductions DECIMAL(15,2) DEFAULT 0,
  total_employer_cost DECIMAL(15,2) DEFAULT 0,

  -- Approval
  approved_by VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payroll_periods_company ON payroll_periods(company_id);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);
CREATE INDEX idx_payroll_periods_dates ON payroll_periods(period_start, period_end);

-- Payslips table
CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id),
  employee_id UUID NOT NULL REFERENCES employees(id),

  -- Earnings
  basic_salary DECIMAL(15,2) NOT NULL,
  overtime DECIMAL(15,2) DEFAULT 0,
  bonuses DECIMAL(15,2) DEFAULT 0,
  allowances DECIMAL(15,2) DEFAULT 0,
  gross_salary DECIMAL(15,2) NOT NULL,
  taxable_income DECIMAL(15,2) NOT NULL,

  -- Deductions
  paye DECIMAL(15,2) NOT NULL,
  ssc DECIMAL(15,2) DEFAULT 0,
  uif DECIMAL(15,2) DEFAULT 0,
  medical_aid DECIMAL(15,2) DEFAULT 0,
  pension DECIMAL(15,2) DEFAULT 0,
  other_deductions DECIMAL(15,2) DEFAULT 0,
  total_deductions DECIMAL(15,2) NOT NULL,

  -- Employer Contributions
  employer_ssc DECIMAL(15,2) DEFAULT 0,
  employer_uif DECIMAL(15,2) DEFAULT 0,
  employer_sdl DECIMAL(15,2) DEFAULT 0,
  employer_vet DECIMAL(15,2) DEFAULT 0,
  total_employer_cost DECIMAL(15,2) NOT NULL,

  net_salary DECIMAL(15,2) NOT NULL,

  -- Document
  pdf_url TEXT,
  emailed_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(payroll_period_id, employee_id)
);

CREATE INDEX idx_payslips_period ON payslips(payroll_period_id);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);

-- Line Items table
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payslip_id UUID NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  rate DECIMAL(15,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_line_items_payslip ON line_items(payslip_id);

-- Statutory Returns table
CREATE TABLE statutory_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  payroll_period_id UUID REFERENCES payroll_periods(id),

  type document_type NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER,

  -- Amounts
  total_paye DECIMAL(15,2),
  total_ssc DECIMAL(15,2),
  total_uif DECIMAL(15,2),
  total_sdl DECIMAL(15,2),
  total_vet DECIMAL(15,2),

  -- Status
  status VARCHAR(20) DEFAULT 'DRAFT',
  submitted_at TIMESTAMP WITH TIME ZONE,
  reference_number VARCHAR(100),

  -- Files
  document_url TEXT,
  export_data JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_statutory_returns_company ON statutory_returns(company_id);
CREATE INDEX idx_statutory_returns_lookup ON statutory_returns(type, year, month);

-- Bank Batches table
CREATE TABLE bank_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id),

  batch_number VARCHAR(50) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  transaction_count INTEGER NOT NULL,

  -- File details
  file_format VARCHAR(20) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT,

  status VARCHAR(20) DEFAULT 'PENDING',
  processed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bank_batches_company ON bank_batches(company_id);
CREATE INDEX idx_bank_batches_period ON bank_batches(payroll_period_id);

-- Leave Balances table
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),

  leave_type VARCHAR(50) NOT NULL,
  entitlement DECIMAL(10,2) NOT NULL,
  taken DECIMAL(10,2) DEFAULT 0,
  balance DECIMAL(10,2) NOT NULL,
  year INTEGER NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(employee_id, leave_type, year)
);

CREATE INDEX idx_leave_balances_employee ON leave_balances(employee_id);

-- Audit Log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),

  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,

  before_data JSONB,
  after_data JSONB,
  metadata JSONB,

  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tax_packs_updated_at BEFORE UPDATE ON tax_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payslips_updated_at BEFORE UPDATE ON payslips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_statutory_returns_updated_at BEFORE UPDATE ON statutory_returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bank_batches_updated_at BEFORE UPDATE ON bank_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();