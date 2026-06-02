export type Role = 'CUSTOMER' | 'ADMIN'
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export type CartItem = {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string
  slug: string
}

export type CheckoutAddress = {
  fullName: string
  email: string
  phone: string
  street: string
  city: string
  province: string
  zip: string
}

export type OrderWithItems = {
  id: string
  userId: string
  status: OrderStatus
  total: number
  paymentId: string | null
  paymentMethod: string
  address: CheckoutAddress
  createdAt: Date
  items: {
    id: string
    productId: string
    name: string
    price: number
    quantity: number
    image: string | null
  }[]
}
