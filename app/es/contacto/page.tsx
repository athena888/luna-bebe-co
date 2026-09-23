import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { LEGAL_NAME, businessAddress } from '@/lib/business-info'

export const metadata: Metadata = {
  title: 'Contáctanos',
  description: 'Contacta al servicio al cliente de Petite Lavande sobre un pedido, producto, envío o devolución.',
  alternates: {
    canonical: '/es/contacto',
    languages: { en: '/contact', 'es-US': '/es/contacto', 'x-default': '/contact' },
  },
}

// Spanish twin of /contact — same legal identity and configured address.
const ADDRESS = businessAddress()

export default function ContactoPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
    <article className="max-w-2xl mx-auto px-6 pt-12 pb-16 font-sans text-bark-600">
      <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-4">Atención al cliente</p>
      <h1 className="font-playfair text-4xl font-normal text-espresso mb-10">Contáctanos</h1>

      <Section title="Atención al cliente">
        ¿Preguntas sobre un pedido, un producto, un envío o una devolución? Escríbenos a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-bark-600 underline underline-offset-2">{CONTACT_EMAIL}</a>.
        {' '}Respondemos las consultas de clientes en días hábiles. Si tu pregunta es sobre un pedido, incluye tu número de pedido.
      </Section>

      <Section title="Información de la empresa">
        <span className="block">{LEGAL_NAME}</span>
        <span className="block">Opera como Petite Lavande</span>
        {ADDRESS && <span className="block mt-3">Dirección postal comercial: {ADDRESS}</span>}
        <span className="block mt-3">Correo: <a href={`mailto:${CONTACT_EMAIL}`} className="text-bark-600 underline underline-offset-2">{CONTACT_EMAIL}</a></span>
      </Section>

      <Section title="Enlaces útiles">
        <ul className="space-y-1 list-disc list-inside text-bark-500">
          <li><a href="/track" className="text-bark-600 underline underline-offset-2">Rastrear pedido</a></li>
          <li><a href="/es/legal/envios" className="text-bark-600 underline underline-offset-2">Política de envíos</a></li>
          <li><a href="/es/legal/devoluciones" className="text-bark-600 underline underline-offset-2">Devoluciones y reembolsos</a></li>
          <li><a href="/es/faq" className="text-bark-600 underline underline-offset-2">Preguntas frecuentes</a></li>
        </ul>
      </Section>
    </article>
      </main>
      <Footer />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-playfair text-xl text-bark-600 mb-3 font-normal">{title}</h2>
      <div className="font-sans text-sm text-bark-500 leading-relaxed">{children}</div>
    </div>
  )
}
