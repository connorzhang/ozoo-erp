import { useState } from 'react'
import { useAppStore } from '@/stores/appStore'

export function Activation() {
  const { activationCode, setActivationCode, addLog } = useAppStore()
  const [isActivating, setIsActivating] = useState(false)
  const [activated, setActivated] = useState(false)

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      addLog('warning', '请输入激活码')
      return
    }

    setIsActivating(true)
    addLog('info', '正在验证激活码...')
    
    setTimeout(() => {
      if (activationCode === 'TEST123456') {
        setActivated(true)
        addLog('success', '激活成功！')
      } else {
        addLog('error', '激活码无效，请联系客服')
      }
      setIsActivating(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-4xl mb-4">🔑</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">软件激活</h2>
      <p className="text-sm text-gray-500 mb-6">请输入您的激活码</p>
      
      {activated ? (
        <div className="text-green-600 text-lg font-medium">
          ✅ 软件已激活
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2">
            <label className="w-20 text-sm font-medium text-gray-700">激活码:</label>
            <input
              type="text"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              placeholder="请输入激活码..."
              className="flex-1 h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isActivating}
            />
          </div>
          <button
            onClick={handleActivate}
            disabled={isActivating}
            className="mt-4 w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isActivating ? '验证中...' : '激活'}
          </button>
          <p className="mt-4 text-xs text-gray-400 text-center">
            测试激活码：TEST123456
          </p>
        </div>
      )}
    </div>
  )
}
