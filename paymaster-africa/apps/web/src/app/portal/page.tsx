'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Calendar, TrendingUp, DollarSign } from 'lucide-react'
import { format } from 'date-fns'

export default function PortalDashboard() {
  const [employee, setEmployee] = useState<any>(null)
  const [recentPayslips, setRecentPayslips] = useState<any[]>([])
  const [leaveBalance, setLeaveBalance] = useState<any>(null)

  useEffect(() => {
    // Fetch employee data
    fetchEmployeeData()
    fetchRecentPayslips()
    fetchLeaveBalance()
  }, [])

  const fetchEmployeeData = async () => {
    // Mock data - replace with actual API call
    setEmployee({
      firstName: 'John',
      lastName: 'Doe',
      employeeNumber: 'EMP001',
      position: 'Software Developer',
      department: 'Engineering',
    })
  }

  const fetchRecentPayslips = async () => {
    // Mock data - replace with actual API call
    setRecentPayslips([
      { id: '1', period: 'March 2025', netPay: 23500, status: 'paid', date: new Date('2025-03-25') },
      { id: '2', period: 'February 2025', netPay: 23500, status: 'paid', date: new Date('2025-02-25') },
      { id: '3', period: 'January 2025', netPay: 22800, status: 'paid', date: new Date('2025-01-25') },
    ])
  }

  const fetchLeaveBalance = async () => {
    // Mock data - replace with actual API call
    setLeaveBalance({
      annual: { total: 21, taken: 5, balance: 16 },
      sick: { total: 10, taken: 2, balance: 8 },
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {employee?.firstName}!
        </h2>
        <p className="text-muted-foreground">
          Employee #{employee?.employeeNumber} • {employee?.position}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Latest Payslip"
          value={recentPayslips[0]?.period || '-'}
          description={`Net Pay: N$ ${recentPayslips[0]?.netPay?.toLocaleString() || '0'}`}
          icon={<FileText className="h-4 w-4" />}
        />
        <MetricCard
          title="Annual Leave"
          value={`${leaveBalance?.annual?.balance || 0} days`}
          description={`${leaveBalance?.annual?.taken || 0} taken of ${leaveBalance?.annual?.total || 0}`}
          icon={<Calendar className="h-4 w-4" />}
        />
        <MetricCard
          title="Sick Leave"
          value={`${leaveBalance?.sick?.balance || 0} days`}
          description={`${leaveBalance?.sick?.taken || 0} taken of ${leaveBalance?.sick?.total || 0}`}
          icon={<Calendar className="h-4 w-4" />}
        />
        <MetricCard
          title="YTD Earnings"
          value="N$ 70,800"
          description="Gross earnings this year"
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Payslips</CardTitle>
            <CardDescription>Your last 3 payslips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayslips.map((payslip) => (
                <div key={payslip.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{payslip.period}</p>
                    <p className="text-sm text-muted-foreground">
                      Paid on {format(payslip.date, 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">N$ {payslip.netPay.toLocaleString()}</span>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button className="w-full" variant="outline">
                View All Payslips
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and downloads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Download Latest Payslip
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Get PAYE5 Certificate
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <User className="mr-2 h-4 w-4" />
              Update Banking Details
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
          <CardDescription>Your earnings for the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            [Chart placeholder - implement with Recharts]
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
  icon
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function User(props: any) {
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
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}