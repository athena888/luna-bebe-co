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
  special_note?: string
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
