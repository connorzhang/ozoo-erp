import { create } from 'zustand'

export interface ProfitParams {
  monthlySalesMin: number
  monthlySalesMax: number
  competitorsMin: number
  competitorsMax: number
  listingDaysMin: number
  listingDaysMax: number
  weightMin: number
  weightMax: number
  priceMin: number
  priceMax: number
  ratingMin: number
  ratingMax: number
  exchangeRate: number
  commissionRate: number
  minProfitRate: number
  imageSimilarity: number
  returnRate: number
  otherCosts: number
}

export interface LogisticsChannel {
  id: string
  name: string
  description: string
  pricePerKg: number
  basePrice: number
}

export interface FileConfig {
  shopTablePath: string
  shopNameTablePath: string
  selectionTablePath: string
  browserDownloadPath: string
}

export interface LogEntry {
  timestamp: Date
  level: 'success' | 'info' | 'warning' | 'error'
  message: string
}

export interface AppState {
  activeTab: 'config' | 'params' | 'logistics' | 'activation' | 'help'
  setActiveTab: (tab: AppState['activeTab']) => void
  
  fileConfig: FileConfig
  setFileConfig: (config: Partial<FileConfig>) => void
  
  profitParams: ProfitParams
  setProfitParams: (params: Partial<ProfitParams>) => void
  
  logisticsChannels: LogisticsChannel[]
  setLogisticsChannels: (channels: LogisticsChannel[]) => void
  
  activationCode: string
  setActivationCode: (code: string) => void
  
  logs: LogEntry[]
  addLog: (level: LogEntry['level'], message: string) => void
  clearLogs: () => void
  
  isSelecting: boolean
  setIsSelecting: (selecting: boolean) => void
  
  saveConfig: () => void
  loadConfig: () => void
}

const defaultProfitParams: ProfitParams = {
  monthlySalesMin: 0,
  monthlySalesMax: 999,
  competitorsMin: 0,
  competitorsMax: 50,
  listingDaysMin: 0,
  listingDaysMax: 365,
  weightMin: 0,
  weightMax: 25000,
  priceMin: 0,
  priceMax: 8888,
  ratingMin: 0,
  ratingMax: 5,
  exchangeRate: 12.0,
  commissionRate: 12,
  minProfitRate: 0.01,
  imageSimilarity: 0.8,
  returnRate: 0.03,
  otherCosts: 0,
}

const defaultLogisticsChannels: LogisticsChannel[] = [
  { id: 'extra-small', name: 'Extra Small', description: '超级轻小件', pricePerKg: 0, basePrice: 0 },
  { id: 'small', name: 'Small', description: '小件', pricePerKg: 0, basePrice: 0 },
  { id: 'premium-small', name: 'Premium Small', description: '高客单价小件', pricePerKg: 0, basePrice: 0 },
  { id: 'budget', name: 'Budget', description: '低客单价标准件', pricePerKg: 0, basePrice: 0 },
  { id: 'big', name: 'Big', description: '大件', pricePerKg: 0, basePrice: 0 },
  { id: 'premium-big', name: 'Premium Big', description: '高客单价大件', pricePerKg: 0, basePrice: 0 },
]

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'config',
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  fileConfig: {
    shopTablePath: '',
    shopNameTablePath: '',
    selectionTablePath: '',
    browserDownloadPath: '',
  },
  
  setFileConfig: (config) => set((state) => ({
    fileConfig: { ...state.fileConfig, ...config }
  })),
  
  profitParams: defaultProfitParams,
  
  setProfitParams: (params) => set((state) => ({
    profitParams: { ...state.profitParams, ...params }
  })),
  
  logisticsChannels: defaultLogisticsChannels,
  
  setLogisticsChannels: (channels) => set({ logisticsChannels: channels }),
  
  activationCode: '',
  
  setActivationCode: (code) => set({ activationCode: code }),
  
  logs: [],
  
  addLog: (level, message) => set((state) => {
    const newLog: LogEntry = {
      timestamp: new Date(),
      level,
      message,
    }
    return { logs: [newLog, ...state.logs].slice(0, 1000) }
  }),
  
  clearLogs: () => set({ logs: [] }),
  
  isSelecting: false,
  
  setIsSelecting: (selecting) => set({ isSelecting: selecting }),
  
  saveConfig: () => {
    const state = get()
    const config = {
      fileConfig: state.fileConfig,
      profitParams: state.profitParams,
      logisticsChannels: state.logisticsChannels,
    }
    localStorage.setItem('ozon-selection-config', JSON.stringify(config))
    state.addLog('success', '配置已保存')
  },
  
  loadConfig: () => {
    const saved = localStorage.getItem('ozon-selection-config')
    if (saved) {
      try {
        const config = JSON.parse(saved)
        set({
          fileConfig: config.fileConfig || get().fileConfig,
          profitParams: config.profitParams || get().profitParams,
          logisticsChannels: config.logisticsChannels || get().logisticsChannels,
        })
        get().addLog('success', '配置已加载')
      } catch {
        get().addLog('error', '配置加载失败')
      }
    }
  },
}))
