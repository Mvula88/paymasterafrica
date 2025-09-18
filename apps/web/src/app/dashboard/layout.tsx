import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import {
  Home,
  Users,
  Calculator,
  FileText,
  BarChart,
  Settings,
  Building,
  Calendar,
  CreditCard,
  Globe2
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-card border-r">
        <div className="p-4 border-b">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Globe2 className="h-6 w-6 text-primary" />
            <span className="font-bold">PayMaster Africa</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          <NavItem href="/dashboard" icon={<Home />} label="Dashboard" />
          <NavItem href="/dashboard/companies" icon={<Building />} label="Companies" />
          <NavItem href="/dashboard/employees" icon={<Users />} label="Employees" />
          <NavItem href="/dashboard/payroll" icon={<Calculator />} label="Payroll Runs" />
          <NavItem href="/dashboard/documents" icon={<FileText />} label="Documents" />
          <NavItem href="/dashboard/payments" icon={<CreditCard />} label="Payments" />
          <NavItem href="/dashboard/calendar" icon={<Calendar />} label="Calendar" />
          <NavItem href="/dashboard/reports" icon={<BarChart />} label="Reports" />
          <NavItem href="/dashboard/settings" icon={<Settings />} label="Settings" />
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="border-b bg-card">
          <div className="flex justify-between items-center p-4">
            <h1 className="text-xl font-semibold">Payroll Management</h1>
            <div className="flex items-center space-x-4">
              <UserButton />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function NavItem({ href, icon, label }: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <span className="h-5 w-5">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}