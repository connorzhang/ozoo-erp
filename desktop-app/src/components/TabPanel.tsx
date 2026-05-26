interface TabPanelProps {
  activeTab: string
  tabs: { id: string; label: string; icon: string }[]
  onTabChange: (tab: string) => void
  children: React.ReactNode
}

export function TabPanel({ activeTab, tabs, onTabChange, children }: TabPanelProps) {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </div>
  )
}
