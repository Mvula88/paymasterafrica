import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Globe2, Shield, Users, Calculator, FileText, BarChart } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Globe2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">PayMaster Africa</span>
          </div>
          <nav className="flex items-center space-x-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="py-20 bg-gradient-to-b from-primary/10 to-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl font-bold mb-6">
                Payroll Management for Africa
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Complete payroll solution for Namibia 🇳🇦 and South Africa 🇿🇦.
                Compliant, automated, and built for growth.
              </p>
              <div className="flex justify-center space-x-4">
                <Link href="/sign-up">
                  <Button size="lg" className="space-x-2">
                    <span>Start Free Trial</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline">
                    Request Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Everything You Need for Payroll
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Calculator className="h-10 w-10" />}
                title="Automated Calculations"
                description="PAYE, SSC, UIF, SDL, and VET levy calculations done automatically with the latest tax tables."
              />
              <FeatureCard
                icon={<FileText className="h-10 w-10" />}
                title="Statutory Compliance"
                description="Generate PAYE5, IRP5, EMP201, EMP501 and all required statutory documents."
              />
              <FeatureCard
                icon={<Users className="h-10 w-10" />}
                title="Employee Portal"
                description="Self-service portal for employees to access payslips and tax certificates."
              />
              <FeatureCard
                icon={<Shield className="h-10 w-10" />}
                title="Bank-Level Security"
                description="Role-based access control, audit logs, and encrypted data storage."
              />
              <FeatureCard
                icon={<Globe2 className="h-10 w-10" />}
                title="Multi-Country Support"
                description="Built for Namibia and South Africa with easy expansion to other African countries."
              />
              <FeatureCard
                icon={<BarChart className="h-10 w-10" />}
                title="Real-Time Reports"
                description="Dashboard with insights, compliance tracking, and export capabilities."
              />
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-8">
                Trusted by Companies Across Africa
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">Companies</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">10K+</div>
                  <div className="text-sm text-muted-foreground">Employees</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">99.9%</div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">100%</div>
                  <div className="text-sm text-muted-foreground">Compliant</div>
                </div>
              </div>
              <Link href="/sign-up">
                <Button size="lg">
                  Join PayMaster Africa Today
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Globe2 className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">PayMaster Africa</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Modern payroll management for African businesses.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features">Features</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/demo">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/careers">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/security">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 PayMaster Africa. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode,
  title: string,
  description: string
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4 text-primary">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}