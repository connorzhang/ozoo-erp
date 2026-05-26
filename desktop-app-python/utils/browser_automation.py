import asyncio
import random
import time
from typing import Dict, Any, List
from dataclasses import dataclass
from playwright.async_api import async_playwright, Browser, Page, Playwright


@dataclass
class BrowserProduct:
    """浏览器获取的商品数据"""
    url: str
    title: str
    price_rub: float
    sales: int
    rating: float
    weight: str
    image_url: str
    seller_name: str
    availability: str


class BrowserAutomation:
    """浏览器自动化引擎"""
    
    def __init__(self, logger):
        self.logger = logger
        self.playwright: Playwright = None
        self.browser: Browser = None
        self.page: Page = None
        self._running = False
        self._paused = False
        
    async def start(self):
        """启动浏览器"""
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=False,
                args=[
                    "--start-maximized",
                    "--disable-blink-features=AutomationControlled",
                    "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                ]
            )
            self.page = await self.browser.new_page()
            await self.page.set_viewport_size({"width": 1920, "height": 1080})
            self.logger.success("浏览器启动成功")
            return True
        except Exception as e:
            self.logger.error(f"浏览器启动失败: {str(e)}")
            return False
            
    async def stop(self):
        """关闭浏览器"""
        if self.page:
            await self.page.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        self.logger.info("浏览器已关闭")
        
    async def login_ozon(self, cookies_path: str = None):
        """登录OZON（使用cookies）"""
        try:
            await self.page.goto("https://www.ozon.ru")
            await self._random_delay(2, 4)
            
            # 如果有cookies文件，加载cookies
            if cookies_path and self._file_exists(cookies_path):
                await self._load_cookies(cookies_path)
                await self.page.reload()
                self.logger.info("已加载cookies")
            else:
                self.logger.warning("未找到cookies文件，请手动登录")
                await self.page.wait_for_timeout(30000)  # 等待手动登录
                
            await self._random_delay(2, 3)
            self.logger.success("OZON登录成功")
            return True
        except Exception as e:
            self.logger.error(f"登录失败: {str(e)}")
            return False
            
    async def search_products(self, keywords: List[str], config: Dict[str, Any]) -> List[BrowserProduct]:
        """搜索商品"""
        products = []
        
        for keyword in keywords:
            if not self._running:
                break
                
            while self._paused:
                await asyncio.sleep(0.5)
                
            try:
                await self._search_keyword(keyword, products, config)
            except Exception as e:
                self.logger.error(f"搜索 '{keyword}' 失败: {str(e)}")
                
        return products
        
    async def _search_keyword(self, keyword: str, products: List[BrowserProduct], config: Dict[str, Any]):
        """搜索单个关键词"""
        self.logger.info(f"搜索关键词: {keyword}")
        
        # 构建搜索URL
        url = f"https://www.ozon.ru/search/?text={keyword}&sorting=rating"
        await self.page.goto(url)
        await self._random_delay(3, 5)
        
        # 等待页面加载
        await self.page.wait_for_selector(".widget-search-result-container", timeout=30000)
        await self._random_delay(2, 3)
        
        # 获取商品列表
        items = await self.page.query_selector_all(".tile-hover-target")
        self.logger.info(f"找到 {len(items)} 个商品")
        
        for item in items:
            try:
                product = await self._extract_product(item)
                if product:
                    products.append(product)
                    self.logger.info(f"提取商品: {product.title}")
            except Exception as e:
                self.logger.warning(f"提取商品失败: {str(e)}")
                
            await self._random_delay(0.5, 1)
            
        # 翻页
        await self._handle_pagination(products, config)
        
    async def _extract_product(self, element) -> BrowserProduct:
        """从元素提取商品信息"""
        try:
            # URL
            url_elem = await element.query_selector("a")
            url = await url_elem.get_attribute("href") if url_elem else ""
            
            # 标题
            title_elem = await element.query_selector(".tsBody500Medium")
            title = await title_elem.inner_text() if title_elem else ""
            
            # 价格
            price_elem = await element.query_selector(".c5i")
            price_text = await price_elem.inner_text() if price_elem else "0"
            price_rub = self._parse_price(price_text)
            
            # 销量
            sales_elem = await element.query_selector(".c6d")
            sales_text = await sales_elem.inner_text() if sales_elem else "0"
            sales = self._parse_sales(sales_text)
            
            # 评分
            rating_elem = await element.query_selector(".c5q")
            rating_text = await rating_elem.inner_text() if rating_elem else "0"
            rating = self._parse_rating(rating_text)
            
            # 图片
            img_elem = await element.query_selector("img")
            image_url = await img_elem.get_attribute("src") if img_elem else ""
            
            return BrowserProduct(
                url=url,
                title=title,
                price_rub=price_rub,
                sales=sales,
                rating=rating,
                weight="",
                image_url=image_url,
                seller_name="",
                availability="",
            )
        except Exception as e:
            self.logger.warning(f"解析商品失败: {str(e)}")
            return None
            
    async def _handle_pagination(self, products: List[BrowserProduct], config: Dict[str, Any]):
        """处理分页"""
        max_pages = config.get("max_pages", 3)
        current_page = 1
        
        while current_page < max_pages:
            next_btn = await self.page.query_selector("button[aria-label='Следующая страница']")
            if not next_btn:
                break
                
            try:
                await next_btn.click()
                await self._random_delay(3, 5)
                current_page += 1
                
                items = await self.page.query_selector_all(".tile-hover-target")
                for item in items:
                    product = await self._extract_product(item)
                    if product:
                        products.append(product)
            except Exception as e:
                self.logger.warning(f"翻页失败: {str(e)}")
                break
                
    async def visit_shop(self, shop_url: str) -> List[BrowserProduct]:
        """访问店铺获取商品"""
        products = []
        try:
            await self.page.goto(shop_url)
            await self._random_delay(3, 5)
            
            # 获取店铺商品
            items = await self.page.query_selector_all(".tile-hover-target")
            for item in items:
                product = await self._extract_product(item)
                if product:
                    products.append(product)
                    
        except Exception as e:
            self.logger.error(f"访问店铺失败: {str(e)}")
            
        return products
        
    async def _load_cookies(self, cookies_path: str):
        """加载cookies"""
        try:
            import json
            with open(cookies_path, 'r', encoding='utf-8') as f:
                cookies = json.load(f)
            
            for cookie in cookies:
                # 移除过期的cookie
                if 'expires' in cookie and cookie['expires'] < time.time():
                    continue
                # 转换Playwright格式
                await self.page.context.add_cookies([{
                    'name': cookie.get('name'),
                    'value': cookie.get('value'),
                    'domain': cookie.get('domain', '.ozon.ru'),
                    'path': cookie.get('path', '/'),
                    'secure': cookie.get('secure', False),
                    'httpOnly': cookie.get('httpOnly', False),
                }])
            self.logger.info("Cookies加载成功")
        except Exception as e:
            self.logger.warning(f"加载cookies失败: {str(e)}")
            
    def _file_exists(self, path: str) -> bool:
        """检查文件是否存在"""
        import os
        return os.path.exists(path)
        
    def _parse_price(self, text: str) -> float:
        """解析价格"""
        try:
            text = ''.join(filter(lambda x: x.isdigit() or x == '.', text))
            return float(text)
        except:
            return 0.0
            
    def _parse_sales(self, text: str) -> int:
        """解析销量"""
        try:
            # 提取数字
            import re
            match = re.search(r'(\d+)', text)
            return int(match.group(1)) if match else 0
        except:
            return 0
            
    def _parse_rating(self, text: str) -> float:
        """解析评分"""
        try:
            text = text.replace(',', '.')
            return float(text)
        except:
            return 0.0
            
    async def _random_delay(self, min_delay: float, max_delay: float):
        """随机延迟"""
        delay = random.uniform(min_delay, max_delay)
        await asyncio.sleep(delay)
        
    def start_task(self):
        """标记任务开始"""
        self._running = True
        self._paused = False
        
    def pause_task(self):
        """暂停任务"""
        self._paused = not self._paused
        
    def stop_task(self):
        """停止任务"""
        self._running = False
        self._paused = False
