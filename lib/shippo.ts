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
  const fromAddress = {
    name: process.env.SHIPPO_FROM_NAME || 'Petite Lavande',
    street1: process.env.SHIPPO_FROM_STREET1 || '123 Your Street',
    city: process.env.SHIPPO_FROM_CITY || 'Your City',
    state: process.env.SHIPPO_FROM_STATE || 'NY',
    zip: process.env.SHIPPO_FROM_ZIP || '10001',
    country: 'US',
    phone: process.env.SHIPPO_FROM_PHONE || '',
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

  // Pick cheapest rate matching carrier preference
  const rates: { servicelevel: { token: string }; amount: string; carrier: string; object_id: string }[] = shipment.rates || []
  if (rates.length === 0) throw new Error('No shipping rates returned from Shippo')

  let rate = isPremium
    ? rates.find(r => r.servicelevel.token.includes('priority') || r.servicelevel.token.includes('express'))
    : rates.find(r => r.servicelevel.token.includes('ground') || r.servicelevel.token.includes('first'))
  if (!rate) rate = rates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0]

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
  if (tx.status !== 'SUCCESS') throw new Error(`Label purchase failed: ${tx.messages?.join(', ')}`)

  return {
    trackingNumber: tx.tracking_number,
    trackingUrl: tx.tracking_url_provider,
    labelUrl: tx.label_url,
    carrier: rate.carrier,
  }
}
