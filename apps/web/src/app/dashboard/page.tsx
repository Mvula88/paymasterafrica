import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Users,
  DollarSign,
  FileText,
  AlertCircle,
  TrendingUp,
  Calendar,
  Building,
  Clock
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your payroll operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Employees"
          value="248"
          change="+12%"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Monthly Payroll"
          value="N$ 1,245,600"
          change="+5.3%"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="Pending Approvals"
          value="3"
          change="Requires action"
          icon={<AlertCircle className="h-4 w-4" />}
          variant="warning"
        />
        <MetricCard
          title="Compliance Score"
          value="98%"
          change="All documents submitted"
          icon={<FileText className="h-4 w-4" />}
          variant="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and operations</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link href="/dashboard/payroll/new">
              <Button className="w-full justify-start">
                <Calculator className="mr-2 h-4 w-4" />
                Run Payroll
              </Button>
            </Link>
            <Link href="/dashboard/employees/new">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </Link>
            <Link href="/dashboard/documents">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Generate Returns
              </Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Reports
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Important dates to remember</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DeadlineItem
              title="PAYE Submission (Namibia)"
              date="20 March 2025"
              status="upcoming"
            />
            <DeadlineItem
              title="EMP201 Return (South Africa)"
              date="7 April 2025"
              status="upcoming"
            />
            <DeadlineItem
              title="SSC Payment"
              date="25 March 2025"
              status="upcoming"
            />
            <DeadlineItem
              title="UIF Declaration"
              date="7 April 2025"
              status="pending"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payroll Runs</CardTitle>
          <CardDescription>Latest processed payrolls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <PayrollRunItem
              company="TechCorp Namibia"
              period="March 2025"
              employees={45}
              amount="N$ 456,200"
              status="paid"
            />
            <PayrollRunItem
              company="RetailCo SA"
              period="March 2025"
              employees={120}
              amount="R 892,400"
              status="approved"
            />
            <PayrollRunItem
              company="ServicePro NA"
              period="February 2025"
              employees={83}
              amount="N$ 621,500"
              status="paid"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  icon,
  variant = 'default'
}: {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'warning'
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={cn(
          "text-xs",
          variant === 'success' && "text-green-600",
          variant === 'warning' && "text-orange-600",
          variant === 'default' && "text-muted-foreground"
        )}>
          {change}
        </p>
      </CardContent>
    </Card>
  )
}

function DeadlineItem({
  title,
  date,
  status
}: {
  title: string
  date: string
  status: 'upcoming' | 'pending' | 'overdue'
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
      </div>
      <Badge variant={
        status === 'overdue' ? 'destructive' :
        status === 'pending' ? 'secondary' :
        'default'
      }>
        {status}
      </Badge>
    </div>
  )
}

function PayrollRunItem({
  company,
  period,
  employees,
  amount,
  status
}: {
  company: string
  period: string
  employees: number
  amount: string
  status: 'draft' | 'approved' | 'paid'
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Building className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{company}</p>
          <p className="text-xs text-muted-foreground">
            {period} • {employees} employees
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{amount}</p>
        <Badge variant={
          status === 'paid' ? 'success' :
          status === 'approved' ? 'secondary' :
          'default'
        }>
          {status}
        </Badge>
      </div>
    </div>
  )
}

import { cn } from '@/lib/utils'

function Badge({
  children,
  variant = 'default'
}: {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'success'
}) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
      variant === 'default' && "bg-primary/10 text-primary",
      variant === 'secondary' && "bg-secondary text-secondary-foreground",
      variant === 'destructive' && "bg-destructive/10 text-destructive",
      variant === 'success' && "bg-green-100 text-green-800"
    )}>
      {children}
    </span>
  )
}

function Calculator(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </svg>
  )
}