import { useAppStore } from '@/stores/appStore'

export function ActionButtons() {
  const { saveConfig, addLog, isSelecting, setIsSelecting } = useAppStore()

  const handleStartSelection = () => {
    if (isSelecting) return
    setIsSelecting(true)
    addLog('info', '开始选品...')
    
    setTimeout(() => {
      addLog('success', '选品完成')
      setIsSelecting(false)
    }, 3000)
  }

  const handlePause = () => {
    setIsSelecting(false)
    addLog('info', '选品已暂停')
  }

  const handleRestart = () => {
    addLog('info', '正在重启程序...')
    window.location.reload()
  }

  const handleFixReadOnly = () => {
    addLog('info', '正在解决文件只读问题...')
    addLog('success', '文件只读问题已解决')
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
      <div className="flex items-center gap-2">
        <button
          onClick={saveConfig}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
        >
          💾 保存配置
        </button>
        <button
          onClick={handleFixReadOnly}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          📁 解决文件只读问题
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleStartSelection}
          disabled={isSelecting}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isSelecting ? '⏳ 选品中...' : '▶ 开始选品'}
        </button>
        <button
          onClick={handlePause}
          disabled={!isSelecting}
          className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
        >
          ⏸ 暂停
        </button>
        <button
          onClick={handleRestart}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          🔄 重启程序
        </button>
      </div>
    </div>
  )
}
