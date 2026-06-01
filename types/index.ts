export type ShippingType = 'standard' | 'premium'
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export type IssueStatus = 'open' | 'in_progress' | 'resolved'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: ProductCategory
  imageEmoji: string
  image?: string        // optional: path like '/products/swaddle-muslin.jpg'
  tag?: string
  ingredients?: string
  hoverImage?: string
  hoverVideo?: string
}

export type ProductCategory = 'swaddle' | 'garment' | 'bath' | 'keepsake' | 'mom'

export interface BoxSelection {
  swaddle: Product | null
  garment: Product | null
  bath: Product | null
  keepsake: Product | null
  mom: Product | null
  extra1?: Product | null
  extra2?: Product | null
}

export interface ShippingAddress {
  name: string
  email: string
  phone?: string
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
}

export interface Order {
  id: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  recipient_name?: string
  selected_items: Product[]
  letter_content?: string
  letter_version?: 1 | 2
  shipping_type: ShippingType
  shipping_address: ShippingAddress
  total_amount: number
  status: OrderStatus
  stripe_payment_intent?: string
  abandoned_cart_email_sent: boolean
  tracking_number?: string
  tracking_url?: string
  shippo_label_url?: string
  created_at: string
}

export interface Inventory {
  product_id: string
  quantity: number
  updated_at: string
}

export interface CustomerIssue {
  id: string
  caller_phone?: string
  issue_summary: string
  full_transcript?: string
  order_id?: string
  status: IssueStatus
  created_at: string
}

export interface GiftGuideAnswers {
  relationship: string
  style: string
  budget: string
  priority: string
}

export interface LetterTemplate {
  id: string
  title: string
  tone: string
  preview: string
  content: string
}

export type AffiliateStatus = 'pending' | 'approved' | 'suspended'
export type AffiliateTier = 'standard' | 'vip'

export interface Affiliate {
  id: string
  user_id: string | null
  email: string
  name: string
  code: string
  commission_rate: number
  tier: AffiliateTier
  status: AffiliateStatus
  stripe_account_id: string | null
  stripe_onboarded: boolean
  social_handle: string | null
  audience_size: string | null
  notes: string | null
  created_at: string
  approved_at: string | null
}

export type ConversionStatus = 'pending' | 'eligible' | 'paid' | 'refunded' | 'reversed'

export interface AffiliateConversion {
  id: string
  affiliate_id: string
  order_id: string
  order_total: number
  commission_amount: number
  commission_rate: number
  status: ConversionStatus
  eligible_at: string | null
  paid_at: string | null
  payout_id: string | null
  stripe_transfer_id: string | null
  created_at: string
}

export interface AffiliatePayout {
  id: string
  affiliate_id: string
  amount: number
  conversion_count: number
  period_start: string
  period_end: string
  stripe_transfer_id: string | null
  status: 'pending' | 'paid' | 'failed'
  failure_reason: string | null
  created_at: string
  paid_at: string | null
}

export type WholesaleStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type WholesaleTier = 'silver' | 'gold' | 'platinum'
export type WholesalePaymentTerms = 'prepay' | 'net30'

export interface WholesaleAccount {
  id: string
  user_id: string | null
  business_name: string
  business_type: string | null
  ein: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  website: string | null
  storefront_address: ShippingAddress | null
  billing_address: ShippingAddress | null
  resale_cert_url: string | null
  expected_monthly_volume: number | null
  status: WholesaleStatus
  tier: WholesaleTier
  payment_terms: WholesalePaymentTerms
  credit_limit: number
  stripe_customer_id: string | null
  notes: string | null
  rejected_reason: string | null
  approved_at: string | null
  created_at: string
}

export interface WholesaleLineItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface WholesaleOrder {
  id: string
  account_id: string
  po_number: string | null
  line_items: WholesaleLineItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  tier_at_order: WholesaleTier
  payment_method: 'card' | 'net30'
  payment_status: 'pending' | 'paid' | 'overdue' | 'voided'
  stripe_invoice_id: string | null
  stripe_payment_intent: string | null
  shipping_address: ShippingAddress
  status: OrderStatus
  tracking_number: string | null
  due_at: string | null
  paid_at: string | null
  created_at: string
}
