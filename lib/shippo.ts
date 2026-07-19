const SHIPPO_API = 'https://api.goshippo.com'
const SHIPPO_KEY = () => process.env.SHIPPO_API_KEY!

function shippoFetch(path: string, body: unknown) {
  return fetch(`${SHIPPO_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `ShippoToken ${SHIPPO_KEY()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export interface ShippoLabel {
  trackingNumber: string
  trackingUrl: string
  labelUrl: string
  carrier: string
}

export async function createShippingLabel({
  toName,
  toStreet1,
  toStreet2,
  toCity,
  toState,
  toZip,
  toPhone,
  isPremium,
}: {
  toName: string
  toStreet1: string
  toStreet2?: string
  toCity: string
  toState: string
  toZip: string
  toPhone?: string
  isPremium: boolean
}): Promise<ShippoLabel> {
  // Safety guard: never buy a real (paid) label outside production.
  // A live token starts with "shippo_live_"; the test token starts with
  // "shippo_test_". Buying a label with a live token charges real money,
  // so block it unless we're actually in the production environment.
  const key = SHIPPO_KEY()
  if (key?.startsWith('shippo_live_') && process.env.NODE_ENV !== 'production') {
    throw new Error(
      'Refusing to buy a LIVE Shippo label outside production. ' +
      'Set SHIPPO_API_KEY to your test token (shippo_test_…) in .env.local for dev testing.'
    )
  }

  const fromAddress = {
    name: process.env.SHIPPO_FROM_NAME || 'Petite Lavande',
    street1: process.env.SHIPPO_FROM_STREET1 || '123 Your Street',
    city: process.env.SHIPPO_FROM_CITY || 'Your City',
    state: process.env.SHIPPO_FROM_STATE || 'NY',
    zip: process.env.SHIPPO_FROM_ZIP || '10001',
    country: 'US',
    phone: process.env.SHIPPO_FROM_PHONE || '',
    // USPS rejects label purchases when the sender has no email.
    email: process.env.SHIPPO_FROM_EMAIL || 'hello@petitelavande.com',
  }

  // Create shipment
  const shipmentRes = await shippoFetch('/shipments/', {
    address_from: fromAddress,
    address_to: {
      name: toName,
      street1: toStreet1,
      street2: toStreet2 || '',
      city: toCity,
      state: toState,
      zip: toZip,
      country: 'US',
      phone: toPhone || '',
    },
    parcels: [{
      length: '12',
      width: '10',
      height: '6',
      distance_unit: 'in',
      weight: '3',
      mass_unit: 'lb',
    }],
    async: false,
  })

  if (!shipmentRes.ok) {
    const err = await shipmentRes.text()
    throw new Error(`Shippo shipment failed: ${err}`)
  }

  const shipment = await shipmentRes.json()

  // Pick a rate: USPS first (the only carrier registered on this Shippo
  // account — UPS rates come back but fail at purchase with
  // ups_registration_error), then cheapest match for the service level.
  const rates: { servicelevel: { token: string }; amount: string; provider?: string; carrier?: string; object_id: string }[] = shipment.rates || []
  if (rates.length === 0) throw new Error('No shipping rates returned from Shippo')

  const wanted = (token: string) => isPremium
    ? token.includes('priority') || token.includes('express')
    : token.includes('ground') || token.includes('first')
  const byPrice = (a: typeof rates[number], b: typeof rates[number]) => parseFloat(a.amount) - parseFloat(b.amount)
  const usps = rates.filter(r => (r.provider ?? r.carrier) === 'USPS')

  const rate =
    usps.filter(r => wanted(r.servicelevel.token)).sort(byPrice)[0] ??
    usps.sort(byPrice)[0] ??
    rates.filter(r => wanted(r.servicelevel.token)).sort(byPrice)[0] ??
    rates.sort(byPrice)[0]

  // Purchase label
  const txRes = await shippoFetch('/transactions/', {
    rate: rate.object_id,
    label_file_type: 'PDF',
    async: false,
  })

  if (!txRes.ok) {
    const err = await txRes.text()
    throw new Error(`Shippo transaction failed: ${err}`)
  }

  const tx = await txRes.json()
  if (tx.status !== 'SUCCESS') {
    // messages are objects ({source, code, text}) — surface the text, not [object Object]
    const detail = (tx.messages ?? []).map((m: { text?: string }) => m?.text ?? JSON.stringify(m)).join(' | ')
    throw new Error(`Label purchase failed: ${detail || 'unknown Shippo error'}`)
  }

  return {
    trackingNumber: tx.tracking_number,
    trackingUrl: tx.tracking_url_provider,
    labelUrl: tx.label_url,
    carrier: rate.provider ?? rate.carrier ?? 'USPS',
  }
}
