import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { esOpenGraph } from '@/lib/es-meta'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

export const metadata: Metadata = {
  title: 'Nuestro algodón — orgánico certificado',
  description: 'Cada set de regalo bebé orgánico se hace con algodón orgánico certificado: puro y suave para la piel del bebé, trazable del campo a la prenda.',
  openGraph: esOpenGraph({ path: '/es/nuestro-algodon', title: 'Nuestro algodón — orgánico certificado | Petite Lavande', description: 'Cada set de regalo bebé orgánico se hace con algodón orgánico certificado: puro y suave para la piel del bebé, trazable del campo a la prenda.' }),
  alternates: {
    canonical: `${BASE}/es/nuestro-algodon`,
    languages: { en: `${BASE}/our-cotton`, 'es-US': `${BASE}/es/nuestro-algodon`, 'x-default': `${BASE}/our-cotton` },
  },
}

// Registro es-US cálido — sin lenguaje clínico, sin promesas médicas.
export default function NuestroAlgodonPage() {
  return (
    <>
      <Header />
      <main className="bg-white min-h-screen">
        <section className="max-w-2xl mx-auto px-6 py-16">
          <h1 className="font-serif text-4xl text-espresso mb-8">Nuestro algodón, en palabras simples</h1>
          <div className="space-y-5 font-sans text-[15px] text-bark-600 leading-relaxed">
            <p>
              La piel de un recién nacido es lo más delicado que tiene. Por eso cada pieza de algodón
              orgánico que empacamos es pura y suave para la piel del bebé — cultivada sin químicos
              agresivos y terminada sin ellos también.
            </p>
            <p>
              Los talleres de algodón con los que trabajamos tienen la certificación GOTS. En palabras simples:
              una organización independiente sigue el algodón desde el campo hasta la prenda terminada —
              cómo se cultiva, cómo se tiñe y cómo se trata a las personas que lo confeccionan.
              No hay que creer en la palabra de nadie: está verificado.
            </p>
            <p>
              No todo en una canastilla es algodón — hay sonajas de madera, lavanda seca, jabones
              botánicos para el baño. Para todo eso la regla es la misma: materiales simples,
              talleres pequeños, hecho con amor.
            </p>
            <p>
              Busca la insignia en cualquier página de producto — si está ahí, esa pieza es de
              algodón orgánico certificado.
            </p>
          </div>
          <p className="mt-10">
            <Link href="/es/canastillas" className="font-sans text-sm text-bark-600 underline underline-offset-2 hover:text-espresso">
              Ver las canastillas →
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
