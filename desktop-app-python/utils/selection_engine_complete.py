import time
import random
import threading
import asyncio
from typing import Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime
import pandas as pd


@dataclass
class Product:
    """商品数据模型"""
    # 基本信息
    url: str = ""
    title: str = ""
    sku: str = ""
    
    # OZON信息
    ozon_price_rub: float = 0.0          # OZON灰标价格(卢布)
    ozon_price_cny: float = 0.0           # OZON灰标价格(人民币)
    ozon_actual_price_cny: float = 0.0    # OZON预估实际售价(人民币)
    
    # 1688信息
   1688_url: str = ""
    1688_price: float = 0.0               # 1688拿货价
    1688_main_image: str = ""
    1688_sku_images: List[str] = field(default_factory=list)
    
    # 商品属性
    sales: int = 0                        # 月销量
    rating: float = 0.0                    # 评分
    weight_g: int = 0                      # 重量(g)
    competitors: int = 0                    # 跟卖人数
    listing_days: int = 0                  # 上架天数
    main_image: str = ""                   # OZON主图
    
    # 费用明细
    commission_rate: float = 0.0           # 佣金比例
    international_shipping: float = 0.0     # 国际物流费用
    domestic_shipping: float = 0.0         # 国内运费
    
    # 利润计算
    profit: float = 0.0                    # 预估利润
    profit_rate: float = 0.0               # 预估利润率
    reference_price_20pct: float = 0.0     # 20%售价参考
    
    # 图片相似度
    image_similarity: float = 0.0          # 图片相似度
    
    # 元数据
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "日期": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "SKU": self.sku,
            "OZON网址": self.url,
            "OZON主图": self.main_image,
            "OZON灰标价格(人民币)": round(self.ozon_price_cny, 2),
            "OZON预估实际售价(人民币)": round(self.ozon_actual_price_cny, 2),
            "1688主图": self.1688_main_image,
            "1688SKU图片": "; ".join(self.1688_sku_images) if self.1688_sku_images else "",
            "1688网址": self.1688_url,
            "重量": self.weight_g,
            "佣金": self.commission_rate,
            "国际物流费用": round(self.international_shipping, 3),
            "1688拿货价": self.1688_price,
            "国内运费": self.domestic_shipping,
            "图片相似度": round(self.image_similarity, 6),
            "预估利润": round(self.profit, 2),
            "预估利润率": round(self.profit_rate, 6),
            "20%售价参考": round(self.reference_price_20pct, 2)
        }


class SelectionEngine:
    """选品引擎 - 完整版"""
    
    def __init__(self, logger):
        self.logger = logger
        self._running = False
        self._paused = False
        self._browser = None
        self._use_browser = False
        
        # 选品统计
        self.stats = {
            "total_products": 0,
            "filtered_products": 0,
            "saved_products": 0,
            "errors": 0
        }
        
    def start_selection(self, config: Dict[str, Any], on_progress=None, on_finish=None):
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
        self.logger.info("选品已暂停")
        
    def stop_selection(self):
        """停止选品"""
        self._running = False
        self._paused = False
        
    def is_running(self) -> bool:
        return self._running
        
    def is_paused(self) -> bool:
        return self._paused
        
    def get_stats(self) -> dict:
        """获取选品统计"""
        return self.stats.copy()
        
    def _selection_task(self, config: Dict[str, Any], on_progress=None, on_finish=None):
        """选品主任务"""
        self.logger.info("开始选品任务...")
        self._reset_stats()
        
        # 1. 读取店铺表
        shop_urls = self._read_shop_table(config)
        if not shop_urls:
            self.logger.warning("未找到店铺表，使用默认搜索")
            shop_urls = ["https://www.ozon.ru/seller/huigeyigou/"]
            
        self.logger.info(f"共读取 {len(shop_urls)} 个店铺")
        
        # 2. 获取商品
        products = []
        if self._use_browser:
            products = self._fetch_products_with_browser(shop_urls, config)
        else:
            products = self._fetch_products_simulated(config)
            
        self.stats["total_products"] = len(products)
        self.logger.info(f"获取到 {len(products)} 个商品")
        
        # 3. 筛选商品
        filtered_products = self._filter_products(products, config)
        self.stats["filtered_products"] = len(filtered_products)
        self.logger.success(f"筛选出 {len(filtered_products)} 个符合条件的商品")
        
        # 4. 计算利润
        self._calculate_profits(filtered_products, config)
        
        # 5. 搜索1688（预留接口）
        # self._search_1688(filtered_products, config)
        
        # 6. 保存结果
        files_config = config.get("files", {})
        if "selection_table" in files_config and files_config["selection_table"]:
            self._save_products(filtered_products, files_config["selection_table"])
            
        # 7. 更新店铺表（标记已跟卖）
        if "shop_table" in files_config and files_config["shop_table"]:
            self._update_shop_table(shop_urls, files_config["shop_table"])
            
        if on_finish:
            on_finish(True)
            
    def _reset_stats(self):
        """重置统计"""
        self.stats = {
            "total_products": 0,
            "filtered_products": 0,
            "saved_products": 0,
            "errors": 0
        }
        
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
                if '店铺' in str(col) and ('链接' in str(col) or 'url' in str(col).lower()):
                    urls = df[col].dropna().astype(str).tolist()
                    break
                    
            if not urls:
                # 尝试第一列
                urls = df.iloc[:, 0].dropna().astype(str).tolist()
                
            # 过滤有效URL
            urls = [u for u in urls if 'ozon.ru' in u]
            
            self.logger.info(f"从店铺表读取了 {len(urls)} 个店铺链接")
        except Exception as e:
            self.logger.error(f"读取店铺表失败: {str(e)}")
            
        return urls
        
    def _fetch_products_with_browser(self, shop_urls: List[str], config: Dict[str, Any]) -> List[Product]:
        """使用浏览器获取商品"""
        products = []
        
        # TODO: 实现真实的浏览器自动化
        # 目前使用模拟模式
        self.logger.warning("浏览器自动化功能开发中，使用模拟数据")
        products.extend(self._fetch_products_simulated(config))
            
        return products
        
    def _fetch_products_simulated(self, config: Dict[str, Any]) -> List[Product]:
        """模拟获取商品"""
        products = []
        params = config.get("params", {})
        
        # 生成模拟商品
        for i in range(20):
            if not self._running:
                break
                
            while self._paused:
                time.sleep(0.5)
                
            product = Product(
                url=f"https://www.ozon.ru/product/item-{random.randint(1000000000, 9999999999)}/",
                title=f"商品 {i + 1}",
                sku=str(random.randint(1000000000, 9999999999)),
                ozon_price_rub=random.randint(800, 6000),
                ozon_price_cny=0,
                ozon_actual_price_cny=0,
                sales=random.randint(20, 99),
                rating=round(random.uniform(3.5, 5.0), 1),
                weight_g=random.randint(100, 25000),
                competitors=random.randint(0, 25),
                listing_days=random.randint(0, 365),
                main_image=f"https://example.com/ozon_img_{i}.jpg",
            )
            products.append(product)
            
            if i % 5 == 0:
                self.logger.info(f"已获取 {i + 1} 个商品...")
                
            time.sleep(random.uniform(0.3, 0.8))
            
        return products
        
    def _filter_products(self, products: List[Product], config: Dict[str, Any]) -> List[Product]:
        """筛选符合条件的商品"""
        params = config.get("params", {})
        filtered = []
        
        for product in products:
            # 月销量范围
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
            if not (params.get("price_min", 0) <= product.ozon_price_rub <= 
                    params.get("price_max", 999999)):
                continue
                
            # 评分范围
            if not (params.get("rating_min", 0) <= product.rating <= 
                    params.get("rating_max", 5)):
                continue
                
            filtered.append(product)
            
        return filtered
        
    def _calculate_profits(self, products: List[Product], config: Dict[str, Any]):
        """计算利润"""
        params = config.get("params", {})
        logistics = config.get("logistics", {}).get("channels", [])
        
        exchange_rate = params.get("exchange_rate", 12.0)
        commission_rate = params.get("commission_rate", 18) / 100
        min_profit_rate = params.get("min_profit_rate", 0.2) / 100
        return_rate = params.get("return_rate", 0.03)
        other_costs = params.get("other_costs", 0.0)
        
        for product in products:
            # 卢布转人民币
            product.ozon_price_cny = round(product.ozon_price_rub / exchange_rate, 2)
            product.ozon_actual_price_cny = round(product.ozon_price_cny * 1.111, 2)
            
            # 计算佣金
            product.commission_rate = commission_rate
            
            # 计算国际物流费用
            product.international_shipping = self._calculate_shipping(product.weight_g, logistics)
            
            # 计算利润
            total_cost = (product.1688_price + 
                         product.domestic_shipping + 
                         product.international_shipping +
                         other_costs)
            
            commission = product.ozon_actual_price_cny * commission_rate
            return_fee = product.ozon_actual_price_cny * return_rate
            
            product.profit = round(product.ozon_actual_price_cny - 
                                  total_cost - commission - return_fee, 2)
            
            if product.ozon_actual_price_cny > 0:
                product.profit_rate = product.profit / product.ozon_actual_price_cny
                # 计算20%利润率参考售价
                cost_20pct = total_cost / (1 - commission_rate - return_rate - 0.2)
                product.reference_price_20pct = round(cost_20pct, 2)
            else:
                product.profit_rate = 0
                product.reference_price_20pct = 0
                
    def _calculate_shipping(self, weight_g: int, channels: List[Dict]) -> float:
        """计算物流成本"""
        if not channels:
            return 0.0
            
        weight_kg = weight_g / 1000
        
        # 简单策略：使用第一个有价格的渠道
        for channel in channels:
            if channel.get("price_kg", 0) > 0 or channel.get("price_per", 0) > 0:
                return round(channel.get("price_kg", 0) * weight_kg + channel.get("price_per", 0), 3)
                
        return 0.0
        
    def _search_1688(self, products: List[Product], config: Dict[str, Any]):
        """搜索1688（预留功能）"""
        # TODO: 实现1688搜索功能
        # 1. 根据商品标题搜索1688
        # 2. 获取1688价格
        # 3. 下载1688图片
        # 4. 计算图片相似度
        pass
        
    def _save_products(self, products: List[Product], file_path: str):
        """保存商品到Excel"""
        if not file_path:
            self.logger.warning("未指定选品表路径，跳过保存")
            return
            
        try:
            data = [p.to_dict() for p in products]
            df = pd.DataFrame(data)
            df.to_excel(file_path, index=False, engine='openpyxl')
            
            self.stats["saved_products"] = len(products)
            self.logger.success(f"已保存 {len(products)} 个商品到 {file_path}")
            
        except Exception as e:
            self.logger.error(f"保存商品失败: {str(e)}")
            self.stats["errors"] += 1
            
    def _update_shop_table(self, shop_urls: List[str], file_path: str):
        """更新店铺表（标记已跟卖）"""
        if not file_path:
            return
            
        try:
            # 读取现有数据
            df = pd.read_excel(file_path, engine='openpyxl')
            
            # 更新已跟卖的店铺
            for i, row in df.iterrows():
                for url in shop_urls:
                    if url in str(row.iloc[0]):
                        df.iloc[i, 1] = "已跟"
                        
            # 保存更新
            df.to_excel(file_path, index=False, engine='openpyxl')
            self.logger.success("店铺表已更新")
            
        except Exception as e:
            self.logger.error(f"更新店铺表失败: {str(e)}")
