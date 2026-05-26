import { useAppStore } from '@/stores/appStore'

export function ConfigForm() {
  const { fileConfig, setFileConfig } = useAppStore()

  const handleBrowse = (field: keyof typeof fileConfig) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files?.[0]) {
        setFileConfig({ [field]: target.files[0].path })
      }
    }
    input.click()
  }

  const handleFolderBrowse = (field: keyof typeof fileConfig) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files?.[0]) {
        setFileConfig({ [field]: target.files[0].path })
      }
    }
    input.click()
  }

  const fields = [
    { key: 'shopTablePath' as const, label: '店铺表', placeholder: '选择店铺表Excel文件路径', browseFn: () => handleBrowse('shopTablePath') },
    { key: 'shopNameTablePath' as const, label: '店铺名称表', placeholder: '选择店铺名称表Excel文件路径', browseFn: () => handleBrowse('shopNameTablePath') },
    { key: 'selectionTablePath' as const, label: '选品表', placeholder: '选择选品表Excel文件路径', browseFn: () => handleBrowse('selectionTablePath') },
    { key: 'browserDownloadPath' as const, label: '浏览器下载位置', placeholder: '选择浏览器下载目录路径', browseFn: () => handleFolderBrowse('browserDownloadPath') },
  ]

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="flex items-center gap-3">
          <label className="w-24 text-sm font-medium text-gray-700">{field.label}:</label>
          <input
            type="text"
            value={fileConfig[field.key]}
            onChange={(e) => setFileConfig({ [field.key]: e.target.value })}
            placeholder={field.placeholder}
            className="flex-1 h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={field.browseFn}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            浏览...
          </button>
        </div>
      ))}
    </div>
  )
}
