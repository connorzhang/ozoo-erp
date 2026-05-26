import { useAppStore } from '@/stores/appStore'

export function CoreParams() {
  const { profitParams, setProfitParams } = useAppStore()

  const numberFields = [
    { key: 'monthlySalesMin' as const, label: '月销量范围 - 最小', unit: '', step: '1' },
    { key: 'monthlySalesMax' as const, label: '月销量范围 - 最大', unit: '', step: '1' },
    { key: 'competitorsMin' as const, label: '跟卖人数范围 - 最小', unit: '', step: '1' },
    { key: 'competitorsMax' as const, label: '跟卖人数范围 - 最大', unit: '', step: '1' },
    { key: 'listingDaysMin' as const, label: '上架时间范围 - 最小', unit: '天', step: '1' },
    { key: 'listingDaysMax' as const, label: '上架时间范围 - 最大', unit: '天', step: '1' },
    { key: 'weightMin' as const, label: '重量范围 - 最小', unit: 'g', step: '1' },
    { key: 'weightMax' as const, label: '重量范围 - 最大', unit: 'g', step: '1' },
    { key: 'priceMin' as const, label: '商品价格范围 - 最小', unit: '₽', step: '1' },
    { key: 'priceMax' as const, label: '商品价格范围 - 最大', unit: '₽', step: '1' },
    { key: 'ratingMin' as const, label: '评分范围 - 最小', unit: '', step: '0.1' },
    { key: 'ratingMax' as const, label: '评分范围 - 最大', unit: '', step: '0.1' },
    { key: 'exchangeRate' as const, label: '汇率', unit: '', step: '0.1' },
    { key: 'commissionRate' as const, label: '佣金比例(%)', unit: '%', step: '0.1' },
    { key: 'minProfitRate' as const, label: '最低利润率', unit: '', step: '0.01' },
    { key: 'imageSimilarity' as const, label: '图片相似度', unit: '', step: '0.01' },
    { key: 'returnRate' as const, label: '退货+提现费率', unit: '', step: '0.01' },
    { key: 'otherCosts' as const, label: '其他费用', unit: '', step: '1' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {numberFields.map((field) => (
        <div key={field.key}>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {field.label}
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={profitParams[field.key]}
              onChange={(e) => setProfitParams({ [field.key]: parseFloat(e.target.value) || 0 })}
              step={field.step}
              className="flex-1 h-9 px-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {field.unit && <span className="text-xs text-gray-500">{field.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
