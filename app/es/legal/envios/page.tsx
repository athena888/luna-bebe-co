import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { FREE_SHIPPING_THRESHOLD, SHIPPING, formatDollars } from '@/lib/products'
import { TRANSIT } from '@/lib/delivery'
import { LEGAL_NAME, businessAddress } from '@/lib/business-info'

export const metadata: Metadata = {
  title: 'Política de envíos',
  description: 'Desde dónde y a dónde envía Petite Lavande, métodos y precios de envío, tiempos de preparación y tiempos estimados de entrega.',
  alternates: {
    canonical: '/es/legal/envios',
    languages: { en: '/legal/shipping', 'es-US': '/es/legal/envios', 'x-default': '/legal/shipping' },
  },
}

// Spanish shipping policy — mirrors /legal/shipping point for point, with the
// same constants as checkout and the FAQ, so neither language can quote a
// different price or transit time.
const band = ([a, b]: [number, number]) => `${a}–${b}`
const ADDRESS = businessAddress()

export default function EnviosPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
    <article className="max-w-2xl mx-auto px-6 pt-12 pb-16 font-sans text-bark-600">
      <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-4">Legal</p>
      <h1 className="font-playfair text-4xl font-normal text-espresso mb-2">Política de envíos</h1>
      <p className="text-bark-400 text-sm mb-10">Última actualización: septiembre 2026</p>

      <Section title="Desde dónde enviamos">
        Los pedidos se empacan a mano y se envían desde Seattle, Washington, EE. UU.
      </Section>

      <Section title="A dónde enviamos">
        Enviamos solo dentro de Estados Unidos, incluidos Alaska y Hawái. Por ahora no hacemos envíos internacionales.
      </Section>

      <Section title="Tiempo de preparación">
        Los pedidos hechos antes de la 1:00 PM hora del Pacífico, de lunes a viernes, se empacan a mano y se entregan a la paquetería ese mismo día. Los pedidos hechos después de la 1:00 PM, o en fin de semana o feriado federal, salen el siguiente día hábil.
      </Section>

      <Section title="Métodos y precios de envío">
        <ul className="mt-1 space-y-2 list-disc list-inside text-bark-500">
          <li><strong>Envío estándar</strong> — {formatDollars(SHIPPING.standard.price)}, por USPS Ground Advantage. <strong>Gratis</strong> en pedidos de {formatDollars(FREE_SHIPPING_THRESHOLD)} o más (total de productos, antes del envío).</li>
          <li><strong>Envío exprés</strong> — {formatDollars(SHIPPING.premium.price)}, 1–2 días hábiles en tránsito después del envío. El envío exprés no entra en la oferta de envío gratis.</li>
          <li><strong>Mensajería el mismo día</strong> (solo área de Seattle) — {formatDollars(SHIPPING.sameday.price)}. Consulta la entrega el mismo día en el área de Seattle más abajo.</li>
        </ul>
        <span className="block mt-3">Las opciones de envío disponibles para tu dirección y sus precios se muestran al finalizar la compra, antes de pagar.</span>
      </Section>

      <Section title="Tiempos estimados de entrega (envío estándar)">
        Contando días hábiles después del envío:
        <ul className="mt-2 space-y-1 list-disc list-inside text-bark-500">
          <li>Washington, Oregón, Idaho y el norte de California: {band(TRANSIT.northwest)} días hábiles</li>
          <li>Estados de las Montañas y el sur de California: {band(TRANSIT.mountain)} días hábiles</li>
          <li>Centro de EE. UU.: {band(TRANSIT.central)} días hábiles</li>
          <li>Costa Este y Florida: {band(TRANSIT.east)} días hábiles</li>
          <li>Alaska y Hawái: {band(TRANSIT.noncontiguous)} días hábiles</li>
        </ul>
        <span className="block mt-3">Los fines de semana y los feriados federales no se cuentan. Cada página de producto muestra una ventana estimada de entrega, y ahí puedes ingresar tu código postal para ver fechas estimadas.</span>
      </Section>

      <Section title="Entrega el mismo día en el área de Seattle">
        La entrega por mensajería el mismo día está disponible solo para códigos postales elegibles del área de Seattle (Seattle, Shoreline y ciudades cercanas del Eastside); la opción aparece al finalizar la compra solo cuando tu código postal califica. Pide antes de la 1:00 PM hora del Pacífico para recibirla esa misma tarde entre 5 y 9 PM; los pedidos hechos después de la 1:00 PM se entregan la tarde siguiente. Por ahora no ofrecemos recogida en persona.
      </Section>

      <Section title="Retrasos de la paquetería">
        Los tiempos de entrega son estimados, no garantías. Los tiempos de tránsito de la paquetería pueden variar ocasionalmente por el clima, temporadas altas u otras circunstancias fuera de nuestro control, y no somos responsables de los retrasos de la paquetería una vez enviado el pedido.
      </Section>

      <Section title="Rastreo">
        Cuando tu pedido salga, te enviamos un correo con la información de rastreo. También puedes consultar el estado de tu pedido en la página <a href="/track" className="text-bark-600 underline underline-offset-2">Rastrear pedido</a>.
      </Section>

      <Section title="Pedidos dañados, perdidos o incorrectos">
        Si tu pedido llega dañado o incorrecto, consulta nuestra <a href="/es/legal/devoluciones" className="text-bark-600 underline underline-offset-2">política de devoluciones y reembolsos</a>. Si el rastreo no muestra movimiento o tu pedido no ha llegado, escríbenos y lo resolvemos con la paquetería.
      </Section>

      <Section title="Contacto">
        {LEGAL_NAME}, que opera como Petite Lavande.{ADDRESS ? ` Dirección postal comercial: ${ADDRESS}.` : ''} ¿Preguntas sobre envíos? Escríbenos a <a href={`mailto:${CONTACT_EMAIL}`} className="text-bark-600 underline underline-offset-2">{CONTACT_EMAIL}</a> o visita nuestra página de <a href="/es/contacto" className="text-bark-600 underline underline-offset-2">contacto</a>.
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
