-- Seed data for PayMaster Africa

-- Insert test organization
INSERT INTO organizations (id, clerk_org_id, name)
VALUES
  ('org_001', 'org_clerk_001', 'Demo Corporation');

-- Insert test users
INSERT INTO users (id, clerk_user_id, email, first_name, last_name, role, organization_id)
VALUES
  ('user_001', 'user_clerk_001', 'owner@democorp.com', 'John', 'Owner', 'OWNER', 'org_001'),
  ('user_002', 'user_clerk_002', 'admin@democorp.com', 'Jane', 'Admin', 'ADMIN', 'org_001'),
  ('user_003', 'user_clerk_003', 'payroll@democorp.com', 'Mike', 'Payroll', 'PAYROLL_OFFICER', 'org_001'),
  ('user_004', 'user_clerk_004', 'john.doe@democorp.com', 'John', 'Doe', 'EMPLOYEE', 'org_001'),
  ('user_005', 'user_clerk_005', 'jane.smith@democorp.com', 'Jane', 'Smith', 'EMPLOYEE', 'org_001');

-- Insert test companies
INSERT INTO companies (id, organization_id, name, registration_number, tax_number, country, pay_frequency, address_line1, city, vet_levy_applicable, sdl_applicable, uif_applicable)
VALUES
  ('comp_001', 'org_001', 'TechCorp Namibia', 'NAM2025001', 'TAX12345', 'NA', 'MONTHLY', '123 Independence Ave', 'Windhoek', true, false, false),
  ('comp_002', 'org_001', 'RetailCo South Africa', 'SA2025002', 'TAX67890', 'ZA', 'MONTHLY', '456 Main Road', 'Cape Town', false, true, true);

-- Insert test employees for Namibia company
INSERT INTO employees (
  id, company_id, user_id, employee_number, first_name, last_name, email, phone,
  national_id, tax_number, hire_date, is_active, bank_name, bank_account_number,
  bank_branch_code, basic_salary, ssc_applicable, uif_applicable, sdl_applicable
)
VALUES
  ('emp_001', 'comp_001', 'user_004', 'EMP001', 'John', 'Doe', 'john.doe@democorp.com',
   '+264 81 234 5678', '85010212345', 'PAYE001', '2023-01-15', true,
   'Bank Windhoek', '1234567890', '280172', 25000, true, false, false),

  ('emp_002', 'comp_001', 'user_005', 'EMP002', 'Jane', 'Smith', 'jane.smith@democorp.com',
   '+264 81 345 6789', '87030354321', 'PAYE002', '2023-03-20', true,
   'FNB Namibia', '0987654321', '280873', 35000, true, false, false);

-- Insert test employees for South Africa company
INSERT INTO employees (
  id, company_id, employee_number, first_name, last_name, email, phone,
  national_id, tax_number, hire_date, is_active, bank_name, bank_account_number,
  bank_branch_code, basic_salary, ssc_applicable, uif_applicable, sdl_applicable
)
VALUES
  ('emp_003', 'comp_002', 'EMP003', 'Peter', 'Johnson', 'peter.j@democorp.com',
   '+27 82 234 5678', '8501015678098', 'TAX003', '2022-06-01', true,
   'Standard Bank', '1122334455', '051001', 45000, false, true, true),

  ('emp_004', 'comp_002', 'EMP004', 'Mary', 'Williams', 'mary.w@democorp.com',
   '+27 82 345 6789', '9003035678098', 'TAX004', '2021-09-15', true,
   'Nedbank', '5544332211', '198765', 55000, false, true, true);

-- Insert tax packs for Namibia (2025)
INSERT INTO tax_packs (
  id, company_id, country, year, month, paye_brackets,
  ssc_employee_rate, ssc_employer_rate, ssc_min_ceiling, ssc_max_ceiling,
  vet_levy_rate, effective_from, is_active
)
VALUES
  ('tax_001', 'comp_001', 'NA', 2025, 3,
   '[{"min": 0, "max": 50000, "rate": 0, "fixedAmount": 0},
     {"min": 50001, "max": 100000, "rate": 0.18, "fixedAmount": 0},
     {"min": 100001, "max": 300000, "rate": 0.25, "fixedAmount": 9000},
     {"min": 300001, "max": 500000, "rate": 0.28, "fixedAmount": 59000},
     {"min": 500001, "max": 800000, "rate": 0.30, "fixedAmount": 115000},
     {"min": 800001, "max": 1500000, "rate": 0.32, "fixedAmount": 205000},
     {"min": 1500001, "max": 999999999, "rate": 0.37, "fixedAmount": 429000}]',
   0.009, 0.009, 500, 11000, 0.01, '2025-03-01', true);

-- Insert tax packs for South Africa (2025)
INSERT INTO tax_packs (
  id, company_id, country, year, month, paye_brackets,
  uif_employee_rate, uif_employer_rate, uif_max_ceiling, sdl_rate,
  effective_from, is_active
)
VALUES
  ('tax_002', 'comp_002', 'ZA', 2025, 3,
   '[{"min": 0, "max": 237100, "rate": 0.18, "fixedAmount": 0},
     {"min": 237101, "max": 370500, "rate": 0.26, "fixedAmount": 42678},
     {"min": 370501, "max": 512800, "rate": 0.31, "fixedAmount": 77362},
     {"min": 512801, "max": 673000, "rate": 0.36, "fixedAmount": 121475},
     {"min": 673001, "max": 857900, "rate": 0.39, "fixedAmount": 179147},
     {"min": 857901, "max": 1817000, "rate": 0.41, "fixedAmount": 251258},
     {"min": 1817001, "max": 999999999, "rate": 0.45, "fixedAmount": 644489}]',
   0.01, 0.01, 17712, 0.01, '2025-03-01', true);

-- Insert sample payroll period
INSERT INTO payroll_periods (
  id, company_id, tax_pack_id, period_start, period_end, status,
  total_gross, total_net, total_paye, total_deductions, total_employer_cost
)
VALUES
  ('period_001', 'comp_001', 'tax_001', '2025-03-01', '2025-03-31', 'DRAFT',
   60000, 48500, 8500, 11500, 61200);

-- Insert leave balances
INSERT INTO leave_balances (employee_id, leave_type, entitlement, taken, balance, year)
VALUES
  ('emp_001', 'ANNUAL', 21, 5, 16, 2025),
  ('emp_001', 'SICK', 10, 2, 8, 2025),
  ('emp_002', 'ANNUAL', 21, 0, 21, 2025),
  ('emp_002', 'SICK', 10, 0, 10, 2025),
  ('emp_003', 'ANNUAL', 21, 10, 11, 2025),
  ('emp_003', 'SICK', 10, 3, 7, 2025),
  ('emp_004', 'ANNUAL', 21, 15, 6, 2025),
  ('emp_004', 'SICK', 10, 1, 9, 2025);