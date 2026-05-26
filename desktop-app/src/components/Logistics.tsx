import { useAppStore } from '@/stores/appStore'

export function Logistics() {
  const { logisticsChannels, setLogisticsChannels } = useAppStore()

  const updateChannel = (id: string, field: 'pricePerKg' | 'basePrice', value: number) => {
    setLogisticsChannels(
      logisticsChannels.map((ch) =>
        ch.id === id ? { ...ch, [field]: value } : ch
      )
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {logisticsChannels.map((channel) => (
        <div key={channel.id} className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="font-medium text-gray-900">{channel.name}</div>
          <div className="text-xs text-gray-500 mb-3">{channel.description}</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">每千克价格(₽/kg)</label>
              <input
                type="number"
                value={channel.pricePerKg}
                onChange={(e) => updateChannel(channel.id, 'pricePerKg', parseFloat(e.target.value) || 0)}
                step="0.0001"
                className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">每票价格(₽)</label>
              <input
                type="number"
                value={channel.basePrice}
                onChange={(e) => updateChannel(channel.id, 'basePrice', parseFloat(e.target.value) || 0)}
                step="0.01"
                className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
