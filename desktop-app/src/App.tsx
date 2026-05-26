import { useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { TabPanel } from '@/components/TabPanel'
import { ConfigForm } from '@/components/ConfigForm'
import { CoreParams } from '@/components/CoreParams'
import { Logistics } from '@/components/Logistics'
import { Activation } from '@/components/Activation'
import { HelpDoc } from '@/components/HelpDoc'
import { LogPanel } from '@/components/LogPanel'
import { ActionButtons } from '@/components/ActionButtons'

function App() {
  const { activeTab, setActiveTab, addLog, loadConfig } = useAppStore()

  useEffect(() => {
    loadConfig()
    addLog('success', '应用程序启动成功')
    addLog('info', '正在初始化配置...')
    addLog('success', '系统就绪，可以开始配置选品参数')
  }, [])

  const tabs = [
    { id: 'config', label: '文件配置', icon: '📁' },
    { id: 'params', label: '核心参数', icon: '⚙️' },
    { id: 'logistics', label: '物流渠道', icon: '📦' },
    { id: 'activation', label: '激活码', icon: '🔑' },
    { id: 'help', label: '使用说明', icon: '📖' },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'config':
        return <ConfigForm />
      case 'params':
        return <CoreParams />
      case 'logistics':
        return <Logistics />
      case 'activation':
        return <Activation />
      case 'help':
        return <HelpDoc />
      default:
        return <ConfigForm />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <h1 className="text-lg font-bold text-gray-900">OZON自动化选品工具</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-sm text-gray-600">选品完成</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <TabPanel
          activeTab={activeTab}
          tabs={tabs}
          onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
        >
          {renderContent()}
        </TabPanel>
      </div>

      <div className="h-48 border-t border-gray-200">
        <LogPanel />
      </div>

      <ActionButtons />
    </div>
  )
}

export default App
