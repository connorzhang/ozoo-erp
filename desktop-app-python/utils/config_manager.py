import json
from pathlib import Path


class ConfigManager:
    """配置管理器"""
    
    def __init__(self):
        self.config_path = self._get_config_path()
        self.config = self._load_default_config()
        
    def _get_config_path(self) -> Path:
        """获取配置文件路径"""
        # 用户目录
        home = Path.home()
        config_dir = home / ".ozon-selection-tool"
        config_dir.mkdir(parents=True, exist_ok=True)
        return config_dir / "config.json"
        
    def _load_default_config(self) -> dict:
        """加载默认配置（参考L盘v8软件）"""
        return {
            "file_config": {
                "shop_file": "",
                "name_file": "",
                "select_file": "",
                "download_path": "",
                "chrome_path": "C:/Program Files/Google/Chrome/Application/chrome.exe"
            },
            "activation_code": "OZONVz5fo1pomsON5JqCCtYw",
            "core_params": {
                "range_0": {"min": 20, "max": 99},      # 月销量范围
                "range_1": {"min": 0, "max": 25},       # 跟卖人数范围
                "range_2": {"min": 0, "max": 365},       # 上架时间范围
                "range_3": {"min": 0, "max": 25000},     # 重量范围(g)
                "range_4": {"min": 800, "max": 6000},   # 价格范围(卢布)
                "range_5": {"min": 0, "max": 5}         # 评分范围
            },
            "single_params": {
                "exchange_rate": 12.0,     # 汇率
                "commission": 18,           # 佣金比例(%)
                "min_profit": 0.2,         # 最低利润率(%)
                "image_similarity": 0.8,    # 图片相似度阈值
                "return_rate": 0.03,        # 退货费率
                "other_costs": 0           # 其他费用
            },
            "logistics": {
                "extra_small": {"per_kg": 25.0, "per_ticket": 3.0},    # 超级轻小件
                "small": {"per_kg": 25.0, "per_ticket": 16.0},          # 小件
                "premium_small": {"per_kg": 25.0, "per_ticket": 22.0}, # 高客单价小件
                "budget": {"per_kg": 17.0, "per_ticket": 23.0},         # 低客单价标准件
                "big": {"per_kg": 17.0, "per_ticket": 36.0},           # 大件
                "premium_big": {"per_kg": 23.0, "per_ticket": 62.0}    # 高客单价大件
            },
            "browser_config": {
                "download_path": "",
                "session_loaded": False,
                "chrome_path": "C:/Program Files/Google/Chrome/Application/chrome.exe"
            },
            "follow_mode": "跟卖最低价",
            "model_selection": "智能模型"
        }
        
    def load(self) -> dict:
        """加载配置"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    saved_config = json.load(f)
                    # 合并默认配置和保存的配置
                    self._merge_config(self.config, saved_config)
            else:
                # 保存默认配置
                self.save()
        except Exception as e:
            print(f"加载配置失败: {e}")
        return self.config
        
    def save(self):
        """保存配置"""
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"保存配置失败: {e}")
            
    def update(self, key: str, value: dict):
        """更新配置"""
        keys = key.split('.')
        config = self.config
        for k in keys[:-1]:
            config = config.setdefault(k, {})
        config[keys[-1]] = value
        
    def _merge_config(self, default: dict, saved: dict):
        """合并配置"""
        for key, value in saved.items():
            if isinstance(value, dict) and key in default:
                self._merge_config(default[key], value)
            else:
                default[key] = value
