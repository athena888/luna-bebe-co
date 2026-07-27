import type { Metadata } from 'next'
import { CONTACT_EMAIL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Devoluciones y Reembolsos',
  description: 'Política de devoluciones, cambios y reembolsos de Petite Lavande.',
  alternates: {
    canonical: '/es/legal/devoluciones',
    languages: { en: '/legal/returns', 'es-US': '/es/legal/devoluciones', 'x-default': '/legal/returns' },
  },
}

// Spanish returns policy — mirrors the English page, reviewer-corrected
// register (present tense, warm).
export default function DevolucionesPage() {
  return (
    <article className="max-w-2xl mx-auto px-6 pt-12 pb-16 font-sans text-bark-600">
      <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-4">Legal</p>
      <h1 className="font-playfair text-4xl font-normal text-espresso mb-2">Devoluciones y Reembolsos</h1>
      <p className="text-bark-400 text-sm mb-10">Última actualización: julio 2026</p>

      <Section title="Nuestro compromiso">
        Cada canastilla de Petite Lavande se hace a mano y con cariño. Si algo no llega bien, queremos arreglarlo.
      </Section>

      <Section title="Artículos dañados o incorrectos">
        Si tu pedido llega dañado o con algo que no pediste, escríbenos dentro de los 7 días con fotos. Te reenviamos lo correcto sin costo o te devolvemos el dinero completo — tú eliges.
      </Section>

      <Section title="Devoluciones por cambio de opinión">
        Como cada canastilla se arma a pedido, no podemos aceptar devoluciones por cambio de opinión una vez enviada. Si necesitas cancelar, escríbenos dentro de las 24 horas de haber hecho tu pedido.
      </Section>

      <Section title="Envío de la devolución">
        Si algo llega dañado o con algo que no pediste, nosotros cubrimos el envío de la devolución. Para cualquier otra devolución aprobada, el envío corre por cuenta del cliente.
      </Section>

      <Section title="Pedidos de regalo">
        ¿Recibiste una canastilla de regalo y algo no llegó bien? Escríbenos con el número de referencia del pedido (viene dentro de la canastilla) y te ayudamos directamente.
      </Section>

      <Section title="Tiempos de reembolso">
        Los reembolsos aprobados se procesan en 3–5 días hábiles y aparecen en tu método de pago original dentro de 5–10 días hábiles, según tu banco.
      </Section>

      <Section title="Artículos sin devolución">
        Por higiene y seguridad, los productos de baño y cuidado que ya se abrieron no tienen devolución, salvo que lleguen defectuosos.
      </Section>

      <Section title="Cómo contactarnos">
        Escríbenos a <a href={`mailto:${CONTACT_EMAIL}`} className="text-bark-600 underline underline-offset-2">{CONTACT_EMAIL}</a> con tu número de pedido y cuéntanos qué pasó. Respondemos dentro de 24 horas.
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-playfair text-xl text-bark-600 mb-3 font-normal">{title}</h2>
      <p className="font-sans text-sm text-bark-500 leading-relaxed">{children}</p>
    </div>
  )
}
