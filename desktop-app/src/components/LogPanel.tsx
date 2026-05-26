import { useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/appStore'

export function LogPanel() {
  const { logs, clearLogs } = useAppStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [logs])

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'success': return 'text-green-600'
      case 'info': return 'text-blue-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getLevelPrefix = (level: string) => {
    switch (level) {
      case 'success': return '[SUCCESS]'
      case 'info': return '[INFO]'
      case 'warning': return '[WARNING]'
      case 'error': return '[ERROR]'
      default: return '[LOG]'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-600">操作日志</span>
        <div className="flex items-center gap-2">
          <button
            onClick={clearLogs}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          >
            清空日志
          </button>
          <button
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          >
            保存日志
          </button>
          <button
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          >
            扩大日志
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-2 font-mono text-xs bg-gray-900 text-gray-300"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">暂无日志</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex gap-2">
              <span className="text-gray-500">{formatTime(log.timestamp)}</span>
              <span className={getLevelStyle(log.level)}>{getLevelPrefix(log.level)}</span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
