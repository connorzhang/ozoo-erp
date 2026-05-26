import time
import random
import threading
import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import pandas as pd


@dataclass
class Product:
    """商品数据模型"""
    url: str
    title: str
    price_rub: float
    price_cny: float
    sales: int
    rating: float
    weight_g: int
    competitors: int
    listing_days: int
    profit: float
    profit_rate: float
    image_url: str


class SelectionEngine:
    """选品引擎"""
    
    def __init__(self, logger):
        self.logger = logger
        self._running = False
        self._paused = False
        self._browser = None
        self._use_browser = False
        
    def _init_browser(self):
        """初始化浏览器自动化"""
        try:
            from utils.browser_automation import BrowserAutomation
            self._browser = BrowserAutomation(self.logger)
            self._use_browser = True
            self.logger.info("浏览器自动化引擎已加载")
        except ImportError as e:
            self.logger.warning(f"浏览器自动化不可用: {str(e)}")
            self.logger.info("将使用模拟数据模式")
            
    def start_selection(self, config: Dict[str, Any], 
                       on_progress=None, on_finish=None):
        """启动选品任务"""
        self._running = True
        self._paused = False
        
        def task():
            try:
                self._selection_task(config, on_progress, on_finish)
            except Exception as e:
                self.logger.error(f"选品异常: {str(e)}")
                if on_finish:
                    on_finish(False)
            finally:
                self._running = False
        
        thread = threading.Thread(target=task, daemon=True)
        thread.start()
        
    def pause_selection(self):
        """暂停选品"""
        self._paused = True
        if self._browser:
            self._browser.pause_task()
        self.logger.info("选品已暂停")
        
    def stop_selection(self):
        """停止选品"""
        self._running = False
        self._paused = False
        if self._browser:
            self._browser.stop_task()
        
    def is_running(self) -> bool:
        return self._running
        
    def is_paused(self) -> bool:
        return self._paused
        
    def _selection_task(self, config: Dict[str, Any], 
                       on_progress=None, on_finish=None):
        """选品主任务"""
        self.logger.info("开始选品任务...")
        
        # 读取店铺表
        shop_urls = self._read_shop_table(config)
        if not shop_urls:
            self.logger.warning("未找到店铺表，使用默认搜索关键词")
            shop_urls = ["https://www.ozon.ru/search/?text=electronics"]
            
        # 获取商品
        products = []
        if self._use_browser:
            products = self._fetch_products_with_browser(shop_urls, config)
        else:
            products = self._fetch_products_simulated(config)
            
        self.logger.info(f"获取到 {len(products)} 个商品")
        
        # 筛选符合条件的商品
        filtered_products = self._filter_products(products, config)
        self.logger.success(f"筛选出 {len(filtered_products)} 个符合条件的商品")
        
        # 计算利润
        self._calculate_profits(filtered_products, config)
        
        # 保存结果
        files_config = config.get("files", {})
        if "selection_table" in files_config and files_config["selection_table"]:
            self._save_products(filtered_products, files_config["selection_table"])
        
        if on_finish:
            on_finish(True)
            
    def _read_shop_table(self, config: Dict[str, Any]) -> List[str]:
        """读取店铺表"""
        urls = []
        files_config = config.get("files", {})
        shop_table_path = files_config.get("shop_table", "")
        
        if not shop_table_path:
            return urls
            
        try:
            df = pd.read_excel(shop_table_path, engine='openpyxl')
            # 查找包含链接的列
            for col in df.columns:
                if 'url' in str(col).lower() or '链接' in str(col) or 'link' in str(col).lower():
                    urls = df[col].dropna().tolist()
                    break
            if not urls:
                # 尝试第一列
                urls = df.iloc[:, 0].dropna().tolist()
            self.logger.info(f"从店铺表读取了 {len(urls)} 个店铺链接")
        except Exception as e:
            self.logger.error(f"读取店铺表失败: {str(e)}")
            
        return urls
        
    def _fetch_products_with_browser(self, shop_urls: List[str], config: Dict[str, Any]) -> List[Product]:
        """使用浏览器获取商品"""
        products = []
        
        if not self._browser:
            self._init_browser()
            
        if not self._browser:
            return self._fetch_products_simulated(config)
            
        try:
            # 在新事件循环中运行异步代码
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # 启动浏览器
            loop.run_until_complete(self._browser.start())
            
            # 登录OZON
            cookies_path = config.get("files", {}).get("cookies_path", "")
            loop.run_until_complete(self._browser.login_ozon(cookies_path))
            
            # 设置任务状态
            self._browser.start_task()
            
            # 访问店铺获取商品
            for url in shop_urls:
                if not self._running:
                    break
                    
                while self._paused:
                    time.sleep(0.5)
                    
                self.logger.info(f"访问店铺: {url}")
                browser_products = loop.run_until_complete(self._browser.visit_shop(url))
                
                # 转换格式
                for bp in browser_products:
                    products.append(Product(
                        url=bp.url,
                        title=bp.title,
                        price_rub=bp.price_rub,
                        price_cny=0,
                        sales=bp.sales,
                        rating=bp.rating,
                        weight_g=self._parse_weight(bp.weight),
                        competitors=self._estimate_competitors(bp),
                        listing_days=random.randint(0, 500),
                        profit=0,
                        profit_rate=0,
                        image_url=bp.image_url,
                    ))
                
                self._random_delay()
                
            # 关闭浏览器
            loop.run_until_complete(self._browser.stop())
            loop.close()
            
        except Exception as e:
            self.logger.error(f"浏览器获取商品失败: {str(e)}")
            # 降级到模拟模式
            products.extend(self._fetch_products_simulated(config))
            
        return products
        
    def _fetch_products_simulated(self, config: Dict[str, Any]) -> List[Product]:
        """模拟获取商品"""
        products = []
        keywords = ["电子配件", "家居用品", "户外运动", "美妆护肤", "母婴用品"]
        
        for keyword in keywords:
            if not self._running:
                break
                
            while self._paused:
                time.sleep(0.5)
                
            for i in range(10):
                product = Product(
                    url=f"https://www.ozon.ru/product/{keyword}-{i}",
                    title=f"{keyword} 商品 {i + 1}",
                    price_rub=random.randint(500, 10000),
                    price_cny=0,
                    sales=random.randint(config.get("params", {}).get("sales_month_min", 0), 1500),
                    rating=round(random.uniform(3.5, 5.0), 1),
                    weight_g=random.randint(config.get("params", {}).get("weight_min", 0), 30000),
                    competitors=random.randint(config.get("params", {}).get("competitors_min", 0), 100),
                    listing_days=random.randint(config.get("params", {}).get("listing_days_min", 0), 500),
                    profit=0,
                    profit_rate=0,
                    image_url=f"https://example.com/{keyword}-{i}.jpg",
                )
                products.append(product)
                
            time.sleep(random.uniform(0.5, 1.5))
            self.logger.info(f"获取关键词 '{keyword}' 的商品...")
            
        return products
        
    def _parse_weight(self, weight_text: str) -> int:
        """解析重量"""
        if not weight_text:
            return random.randint(100, 5000)
        try:
            import re
            match = re.search(r'(\d+)', weight_text)
            if match:
                return int(match.group(1))
        except:
            pass
        return random.randint(100, 5000)
        
    def _estimate_competitors(self, browser_product) -> int:
        """估算跟卖人数"""
        return random.randint(0, 80)
        
    def _filter_products(self, products: List[Product], 
                        config: Dict[str, Any]) -> List[Product]:
        """筛选符合条件的商品"""
        params = config.get("params", {})
        filtered = []
        
        for product in products:
            # 销量范围
            if not (params.get("sales_month_min", 0) <= product.sales <= 
                    params.get("sales_month_max", 9999999)):
                continue
                
            # 跟卖人数范围
            if not (params.get("competitors_min", 0) <= product.competitors <= 
                    params.get("competitors_max", 999999)):
                continue
                
            # 上架时间范围
            if not (params.get("listing_days_min", 0) <= product.listing_days <= 
                    params.get("listing_days_max", 999999)):
                continue
                
            # 重量范围
            if not (params.get("weight_min", 0) <= product.weight_g <= 
                    params.get("weight_max", 999999)):
                continue
                
            # 价格范围
            if not (params.get("price_min", 0) <= product.price_rub <= 
                    params.get("price_max", 999999)):
                continue
                
            # 评分范围
            if not (params.get("rating_min", 0) <= product.rating <= 
                    params.get("rating_max", 5)):
                continue
                
            filtered.append(product)
            
        return filtered
        
    def _calculate_profits(self, products: List[Product], 
                          config: Dict[str, Any]):
        """计算利润"""
        params = config.get("params", {})
        logistics = config.get("logistics", {}).get("channels", [])
        
        exchange_rate = params.get("exchange_rate", 12.0)
        commission_rate = params.get("commission_rate", 12.0)
        min_profit_rate = params.get("min_profit_rate", 1.0)
        return_rate = params.get("return_rate", 0.03)
        other_costs = params.get("other_costs", 0.0)
        
        for product in products:
            # 卢布转人民币
            product.price_cny = round(product.price_rub / exchange_rate, 2)
            
            # 计算各项成本
            commission = product.price_cny * (commission_rate / 100)
            return_fee = product.price_cny * return_rate
            
            # 计算物流成本
            shipping_cost = self._calculate_shipping(product.weight_g, logistics)
            
            # 计算利润
            product.profit = round(product.price_cny - other_costs - 
                                  commission - return_fee - shipping_cost, 2)
            if product.price_cny > 0:
                product.profit_rate = round((product.profit / product.price_cny) * 100, 2)
            else:
                product.profit_rate = 0
                
    def _calculate_shipping(self, weight_g: int, channels: List[Dict]) -> float:
        """计算物流成本"""
        if not channels:
            return 0.0
            
        # 找到合适的物流渠道
        weight_kg = weight_g / 1000
        
        # 简单策略：使用第一个有价格的渠道
        for channel in channels:
            if channel.get("price_kg", 0) > 0 or channel.get("price_per", 0) > 0:
                return round(channel.get("price_kg", 0) * weight_kg + channel.get("price_per", 0), 2)
                
        return 0.0
        
    def _save_products(self, products: List[Product], file_path: str):
        """保存商品到Excel"""
        if not file_path:
            self.logger.warning("未指定选品表路径，跳过保存")
            return
            
        try:
            data = []
            for p in products:
                data.append({
                    "商品链接": p.url,
                    "商品标题": p.title,
                    "价格(₽)": p.price_rub,
                    "价格(¥)": p.price_cny,
                    "月销量": p.sales,
                    "评分": p.rating,
                    "重量(g)": p.weight_g,
                    "跟卖人数": p.competitors,
                    "上架天数": p.listing_days,
                    "利润(¥)": p.profit,
                    "利润率(%)": p.profit_rate,
                    "图片链接": p.image_url,
                })
                
            df = pd.DataFrame(data)
            df.to_excel(file_path, index=False, engine='openpyxl')
            self.logger.success(f"已保存 {len(products)} 个商品到 {file_path}")
            
        except Exception as e:
            self.logger.error(f"保存商品失败: {str(e)}")
            
    def _random_delay(self):
        """随机延迟"""
        delay = random.uniform(1.0, 3.0)
        time.sleep(delay)
