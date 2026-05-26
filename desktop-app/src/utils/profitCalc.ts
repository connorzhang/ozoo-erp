import type { ProfitParams } from '@/stores/appStore'

export interface Product {
  price: number           // RUB
  cost: number            // CNY
  weight: number          // g
  shipping: number        // CNY
  sales: number           // monthly
  competitors: number     // count
  listingDays: number     // days
  rating: number          // 0-5
  imageUrl: string
}

export interface ProfitResult {
  priceCNY: number
  profit: number
  profitRate: number
  meetsCriteria: boolean
}

export function calculateProfit(params: ProfitParams, product: Product): ProfitResult {
  const { exchangeRate, commissionRate, returnRate, minProfitRate } = params
  
  const priceCNY = product.price / exchangeRate
  const commission = priceCNY * (commissionRate / 100)
  const returnFee = priceCNY * returnRate
  
  const profit = priceCNY - product.cost - product.shipping - commission - returnFee - params.otherCosts
  const profitRate = priceCNY > 0 ? (profit / priceCNY) * 100 : 0
  
  return {
    priceCNY: Math.round(priceCNY * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    profitRate: Math.round(profitRate * 100) / 100,
    meetsCriteria: profitRate >= minProfitRate * 100,
  }
}

export function checkCriteria(params: ProfitParams, product: Product): boolean {
  return (
    product.sales >= params.monthlySalesMin &&
    product.sales <= params.monthlySalesMax &&
    product.competitors >= params.competitorsMin &&
    product.competitors <= params.competitorsMax &&
    product.listingDays >= params.listingDaysMin &&
    product.listingDays <= params.listingDaysMax &&
    product.weight >= params.weightMin &&
    product.weight <= params.weightMax &&
    product.price >= params.priceMin &&
    product.price <= params.priceMax &&
    product.rating >= params.ratingMin &&
    product.rating <= params.ratingMax
  )
}

export function calculateShipping(params: { weight: number }, channels: { id: string; pricePerKg: number; basePrice: number }[]): number {
  const weightKg = params.weight / 1000
  
  let shipping = 0
  const channel = channels[0]
  if (channel) {
    shipping = channel.basePrice + channel.pricePerKg * weightKg
  }
  
  return Math.round(shipping * 100) / 100
}
