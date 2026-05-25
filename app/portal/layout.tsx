import Link from 'next/link'
import { LayoutDashboard, ShoppingBag, Phone, ImagePlus, Home, BarChart2, Target, Camera, TrendingUp, Users, Briefcase, Webhook } from 'lucide-react'

const NAV = [
  { href: '/portal', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { href: '/portal/orders', label: 'Orders', icon: <ShoppingBag size={16} /> },
  { href: '/portal/issues', label: 'Phone Issues', icon: <Phone size={16} /> },
  { href: '/portal/products', label: 'Products', icon: <ImagePlus size={16} /> },
  { href: '/portal/affiliates', label: 'Affiliates', icon: <Users size={16} /> },
  { href: '/portal/wholesale', label: 'Wholesale', icon: <Briefcase size={16} /> },
  { href: '/portal/webhooks', label: 'Webhooks', icon: <Webhook size={16} /> },
  { href: '/portal/home-images', label: 'Home Images', icon: <Home size={16} /> },
  { href: '/portal/social', label: 'Social Feed', icon: <Camera size={16} /> },
  { href: '/portal/analytics', label: 'Ad Analytics', icon: <TrendingUp size={16} /> },
]

const ANALYTICS = [
  { href: 'https://analytics.google.com', label: 'Google Analytics', icon: <BarChart2 size={16} /> },
  { href: 'https://business.facebook.com', label: 'Meta Business', icon: <Target size={16} /> },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bark-700">
      <aside className="w-56 shrink-0 bg-bark-800 border-r border-bark-600/40 flex flex-col py-8 px-4">
        <div className="mb-8 px-2">
          <div className="font-serif text-sm tracking-[0.2em] uppercase text-gold-300">La Lumière</div>
          <div className="font-sans text-[9px] uppercase tracking-[0.35em] text-gold-400/60 mt-0.5">Collective — Portal</div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-sans text-sm text-cream-300 hover:bg-bark-600/50 hover:text-cream-100 transition-colors"
            >
              <span className="text-gold-400/70">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 px-2">
          <p className="font-sans text-[9px] uppercase tracking-[0.25em] text-bark-400 mb-2 px-1">Analytics</p>
          <div className="flex flex-col gap-1">
            {ANALYTICS.map(({ href, label, icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-sans text-sm text-cream-300 hover:bg-bark-600/50 hover:text-cream-100 transition-colors"
              >
                <span className="text-gold-400/70">{icon}</span>
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-auto px-2">
          <div className="text-[10px] font-sans text-bark-400 leading-relaxed">
            La Lumière Collective<br />Internal Portal
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-cream-100">
        {children}
      </main>
    </div>
  )
}
