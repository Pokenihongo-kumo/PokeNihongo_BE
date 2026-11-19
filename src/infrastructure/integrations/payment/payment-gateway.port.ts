// Taking payments (integration-ports plan I2). Business code injects this
// port; PAYMENT_DRIVER picks the adapter. Our own types only: no SDK type
// leaves the adapter.
export interface PaymentLinkItem {
  name: string
  quantity: number
  price: number
}

export interface CreatePaymentLinkInput {
  orderCode: number
  amount: number
  description: string
  items: PaymentLinkItem[]
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
  returnUrl: string
  cancelUrl: string
  // unix seconds
  expiredAt: number
}

export interface PaymentLink {
  orderCode: number
  amount: number
  checkoutUrl: string
  qrCode: string
  paymentLinkId: string
  // unix seconds
  expiredAt: number
}

export interface PaymentLinkInfo {
  orderCode: number
  amount: number
  // PENDING, PROCESSING, PAID, CANCELLED, EXPIRED, FAILED
  status: string
}

export interface PaymentWebhookData {
  orderCode: number
  amount: number
  // '00' when paid
  code: string
}

export abstract class PaymentGateway {
  abstract createLink(input: CreatePaymentLinkInput): Promise<PaymentLink>
  // The provider's view of an order (server to server)
  abstract getLink(orderCode: number): Promise<PaymentLinkInfo>
  // Rejects when the signature does not verify
  abstract verifyWebhook(body: unknown): Promise<PaymentWebhookData>
}
