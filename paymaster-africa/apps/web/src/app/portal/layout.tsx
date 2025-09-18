import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import {
  Home,
  FileText,
  User,
  Calendar,
  Download,
  Globe2
} from 'lucide-react'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-card border-r">
        <div className="p-4 border-b">
          <Link href="/portal" className="flex items-center space-x-2">
            <Globe2 className="h-6 w-6 text-primary" />
            <span className="font-bold">Employee Portal</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          <NavItem href="/portal" icon={<Home />} label="Dashboard" />
          <NavItem href="/portal/payslips" icon={<FileText />} label="Payslips" />
          <NavItem href="/portal/documents" icon={<Download />} label="Documents" />
          <NavItem href="/portal/leave" icon={<Calendar />} label="Leave Balance" />
          <NavItem href="/portal/profile" icon={<User />} label="My Profile" />
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="border-b bg-card">
          <div className="flex justify-between items-center p-4">
            <h1 className="text-xl font-semibold">Employee Self Service</h1>
            <UserButton />
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