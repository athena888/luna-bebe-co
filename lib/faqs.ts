import { RETURNS_SUMMARY, RETURNS_SUMMARY_ES } from './site-config.ts'
import { FREE_SHIPPING_THRESHOLD, SHIPPING, formatDollars } from './products.ts'

// Shared FAQ content — rendered on /faq and /es/faq (both with FAQPage schema)
// and linked from every box page's buy panel. Returns/cancellation wording
// comes from site-config and the shipping figures from products.ts, so neither
// can drift from the Returns Policy page or the real checkout prices.
const FREE_OVER = formatDollars(FREE_SHIPPING_THRESHOLD)
const STANDARD = formatDollars(SHIPPING.standard.price)
const RUSH = formatDollars(SHIPPING.premium.price)

export interface Faq { q: string; a: string }

export const SITE_FAQS: Faq[] = [
  { q: 'Can I change what\'s inside a box?', a: 'Every piece is swappable — use Build Your Own Box to choose item by item, or note a swap at checkout and we\'ll accommodate where stock allows.' },
  { q: 'What are the materials, and is everything baby-safe?', a: 'Our boxes hold a curated mix: organic-cotton textiles, natural-material baby items, and gifts for the mother. Selected textiles are made with organic cotton. Material, ingredient and certification details — including any safety notes — are listed on each individual product page where applicable, so you can check any single item before you buy.' },
  { q: 'How fast does it ship?', a: 'Same-day dispatch is available. Orders placed before 1:00 PM Pacific, Monday to Friday, are typically hand-packed and handed to the carrier that same business day; anything later (or over a weekend or federal holiday) is processed the next business day. That is dispatch time — the carrier\'s transit time is counted after that, and is listed under "When will it arrive?" below. At checkout you can also tell us your occasion date and we\'ll show the order-by date.' },
  { q: 'When will it arrive?', a: 'Boxes ship from Seattle by USPS Ground Advantage. Counting business days after it ships: 2–3 to Washington, Oregon, Idaho and Northern California; 3–4 to the Mountain states and Southern California; 4–5 to the Central US; 5–6 to the East Coast and Florida; 7–10 to Alaska and Hawaii. Every product page shows an estimated delivery window, and you can enter your ZIP code there for exact dates. Weekends and federal holidays are never counted.' },
  { q: 'Where do you ship?', a: 'We currently ship within the United States, including Alaska and Hawaii. We do not ship internationally at this time.' },
  { q: 'How much is shipping?', a: `Free over ${FREE_OVER}. Below that, standard shipping is ${STANDARD} and rush is ${RUSH} (1–2 business days).` },
  { q: 'Can I include a gift note?', a: 'Always — you\'ll write your message before checkout and we hand-finish a card for every box. If you add the recipient\'s email, they receive a digital note when the box ships.' },
  { q: 'What if I need to cancel or return?', a: RETURNS_SUMMARY },
]

// Same eight questions in es-US. Kept parallel to SITE_FAQS (same order, same
// promises) — a Spanish reader must never get a different policy from an
// English one. Only the returns answer is shared, via RETURNS_SUMMARY_ES.
export const SITE_FAQS_ES: Faq[] = [
  { q: '¿Puedo cambiar lo que va dentro de la canastilla?', a: 'Cada pieza se puede cambiar — usa Arma tu canastilla para elegirla artículo por artículo, o indícanos el cambio al finalizar la compra y lo acomodamos según disponibilidad.' },
  { q: '¿De qué materiales es, y es todo seguro para el bebé?', a: 'Nuestras canastillas llevan una mezcla curada: textiles de algodón orgánico, artículos de bebé de materiales naturales y regalos para la mamá. Algunos textiles están hechos con algodón orgánico. Los detalles de materiales, ingredientes y certificaciones — incluidas las notas de seguridad — se indican en cada página de producto cuando corresponde, para que puedas revisar cualquier artículo antes de comprar.' },
  { q: '¿Qué tan rápido se envía?', a: 'Hay despacho el mismo día. Los pedidos hechos antes de la 1:00 PM hora del Pacífico, de lunes a viernes, normalmente se empacan a mano y se entregan a la paquetería ese mismo día hábil; los posteriores (o en fin de semana o feriado federal) se procesan el siguiente día hábil. Ese es el tiempo de despacho — el tiempo de tránsito de la paquetería se cuenta después, y aparece en «¿Cuándo llega?» más abajo. Al finalizar la compra también puedes indicarnos la fecha de tu ocasión y te mostramos la fecha límite para pedir.' },
  { q: '¿Cuándo llega?', a: 'Las canastillas se envían desde Seattle por USPS Ground Advantage. Contando días hábiles después del envío: 2–3 a Washington, Oregón, Idaho y el norte de California; 3–4 a los estados de las Montañas y el sur de California; 4–5 al centro de EE. UU.; 5–6 a la Costa Este y Florida; 7–10 a Alaska y Hawái. Cada página de producto muestra una ventana estimada de entrega, y ahí puedes ingresar tu código postal para ver las fechas exactas. Los fines de semana y los feriados federales nunca se cuentan.' },
  { q: '¿A dónde envían?', a: 'Por ahora enviamos dentro de Estados Unidos, incluidos Alaska y Hawái. No hacemos envíos internacionales por el momento.' },
  { q: '¿Cuánto cuesta el envío?', a: `Gratis en pedidos de más de ${FREE_OVER}. Por debajo de eso, el envío estándar cuesta ${STANDARD} y el exprés ${RUSH} (1–2 días hábiles).` },
  { q: '¿Puedo incluir una nota de regalo?', a: 'Siempre — escribes tu mensaje antes de finalizar la compra y hacemos a mano una tarjeta para cada canastilla. Si agregas el correo de quien la recibe, le llega una nota digital cuando la canastilla se envía.' },
  { q: '¿Y si necesito cancelar o devolver?', a: RETURNS_SUMMARY_ES },
]
