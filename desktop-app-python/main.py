import os
import sys
import random
import asyncio
import re
import pandas as pd
from datetime import datetime

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QTextEdit, QFrame, QProgressBar, QLineEdit, 
    QDoubleSpinBox, QSpinBox, QGroupBox, QGridLayout, QSizePolicy
)
from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QFont, QPalette, QColor


class SelectionWorker(QThread):
    log_signal = Signal(str, str)
    progress_signal = Signal(int)
    finished_signal = Signal(bool)
    
    def __init__(self, params):
        super().__init__()
        self._running = True
        self.params = params
        
    def run(self):
        asyncio.run(self._run_async())
        
    async def _run_async(self):
        from playwright.async_api import async_playwright
        
        try:
            self.log_signal.emit("info", "开始选品任务...")
            self.log_signal.emit("info", f"筛选条件: 价格范围 {self.params['min_price']}-{self.params['max_price']}₽")
            self.log_signal.emit("info", f"搜索关键词: {self.params['keywords']}")
            self.progress_signal.emit(10)
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=False,
                    args=[
                        "--start-maximized",
                        "--disable-blink-features=AutomationControlled"
                    ]
                )
                
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    viewport={"width": 1920, "height": 1080},
                    locale="ru-RU"
                )
                page = await context.new_page()
                
                try:
                    base_url = "https://www.ozon.ru/search/"
                    url_params = []
                    url_params.append(f"text={self.params['keywords']}")
                    if self.params['min_price'] > 0:
                        url_params.append(f"price_min={int(self.params['min_price'])}")
                    if self.params['max_price'] < 100000:
                        url_params.append(f"price_max={int(self.params['max_price'])}")
                    
                    search_url = f"{base_url}?{'&'.join(url_params)}"
                    self.log_signal.emit("info", f"访问搜索页面: {search_url}")
                    await page.goto(search_url, timeout=60000)
                    await asyncio.sleep(5)
                    
                    self.log_signal.emit("info", "等待页面加载...")
                    await asyncio.sleep(8)
                    
                    self.log_signal.emit("info", "模拟滚动页面...")
                    for i in range(5):
                        await page.mouse.wheel(0, 800)
                        await asyncio.sleep(random.uniform(1.5, 2.5))
                    
                    self.log_signal.emit("info", "提取商品数据...")
                    
                    links = await page.query_selector_all('a')
                    self.log_signal.emit("info", f"找到 {len(links)} 个链接")
                    
                    products_data = []
                    seen_urls = set()
                    price_found_count = 0
                    sales_found_count = 0
                    
                    for link in links[:150]:
                        try:
                            href = await link.get_attribute('href')
                            if not href or '/product/' not in href:
                                continue
                                
                            if href in seen_urls:
                                continue
                            seen_urls.add(href)
                            
                            text = await link.text_content()
                            if not text or len(text) < 5:
                                continue
                            
                            parent = await link.query_selector('..')
                            price_found = 0
                            
                            if parent:
                                spans = await parent.query_selector_all('span')
                                for span in spans:
                                    span_text = await span.text_content()
                                    if span_text:
                                        nums = ''.join(filter(lambda x: x.isdigit() or x == '.', span_text))
                                        if nums:
                                            try:
                                                price_found = float(nums)
                                                if price_found > 0 and price_found < 100000:
                                                    break
                                            except:
                                                continue
                            
                            if price_found == 0:
                                html = await parent.inner_html() if parent else ''
                                match = re.search(r'(\d+(?:\.\d+)?)\s*[₽рубrub]', html, re.IGNORECASE)
                                if match:
                                    price_found = float(match.group(1))
                            
                            if price_found > 0:
                                price_found_count += 1
                                
                                # 价格筛选
                                if price_found < self.params['min_price'] or price_found > self.params['max_price']:
                                    continue
                                
                                # 从页面提取真实数据
                                sales = 0
                                rating = 0.0
                                competitors = 0
                                
                                if parent:
                                    all_text = await parent.inner_text()
                                    html_content = await parent.inner_html()
                                    
                                    # 1. 提取销量/库存（尝试多种格式）
                                    sales_patterns = [
                                        r'(\d+(?:[\.,]\d+)?)\s*(шт|шт\.)',  # 俄语格式 "942 шт"
                                        r'(\d+)\s*шт\s*осталось',           # 库存格式 "420 шт осталось"
                                        r'в\s*наличии\s*(\d+)',             # "в наличии 120"
                                        r'(\d+)\s*в\s*наличии',             # "120 в наличии"
                                        r'(\d+)\s*items?\s*in\s*stock',     # 英文格式
                                        r'(\d{2,})\s*(шт|ед|item|pcs)',     # 更通用的单位
                                        r'sold\s+(\d+)',                    # 英文销售数量
                                        r'(\d+)\s*продано',                 # 俄语销售数量
                                    ]
                                    
                                    for pattern in sales_patterns:
                                        match = re.search(pattern, all_text, re.IGNORECASE)
                                        if match:
                                            try:
                                                sales = int(float(match.group(1).replace(',', '.')))
                                                if sales > 0 and sales < 100000:
                                                    sales_found_count += 1
                                                    break
                                            except:
                                                continue
                                    
                                    # 如果还没找到，尝试从HTML属性或脚本中提取
                                    if sales == 0:
                                        script_match = re.search(r'"quantity":(\d+)', html_content)
                                        if script_match:
                                            sales = int(script_match.group(1))
                                            sales_found_count += 1
                                
                                # 显示调试信息
                                if sales == 0:
                                    self.log_signal.emit("info", f"价格:{price_found}₽ 但未找到销量 - 文本片段:{text[:50]}")
                                
                                # 销量范围筛选（允许没有销量数据的商品）
                                if sales > 0:
                                    if sales < self.params['min_sales'] or sales > self.params['max_sales']:
                                        continue
                                
                                products_data.append({
                                    "title": text.strip()[:100],
                                    "price_rub": price_found,
                                    "url": href,
                                    "sales": sales,
                                    "rating": rating,
                                    "competitors": competitors,
                                    "profit_margin": 0.0
                                })
                                self.log_signal.emit("info", f"找到商品: {text[:30]}... - {price_found}₽ - 销量:{sales}")
                                
                        except Exception as e:
                            continue
                    
                    self.log_signal.emit("info", f"调试: 找到价格 {price_found_count} 个, 找到销量 {sales_found_count} 个")
                    
                    self.log_signal.emit("success", f"成功提取到 {len(products_data)} 个商品！")
                    self.progress_signal.emit(70)
                    
                    products_data.sort(key=lambda x: x['sales'], reverse=True)
                    
                    exchange_rate = self.params['exchange_rate']
                    commission_rate = self.params['commission_rate'] / 100
                    shipping_cost = self.params['shipping_cost']
                    
                    for p in products_data:
                        price_cny = p['price_rub'] / exchange_rate
                        cost_price = price_cny * 0.6
                        commission = price_cny * commission_rate
                        profit = price_cny - cost_price - commission - shipping_cost
                        p['price_cny'] = round(price_cny, 2)
                        p['cost_price'] = round(cost_price, 2)
                        p['commission'] = round(commission, 2)
                        p['shipping'] = shipping_cost
                        p['profit'] = round(profit, 2)
                        p['profit_rate'] = round(profit / price_cny * 100, 1)
                    
                    if products_data:
                        df = pd.DataFrame(products_data)
                        output_path = os.path.join(os.path.dirname(__file__), "samples", "选品结果.xlsx")
                        df.to_excel(output_path, index=False, engine='openpyxl')
                        self.log_signal.emit("success", f"结果已保存到: {output_path}")
                    
                    self.log_signal.emit("success", f"选品完成，共找到 {len(products_data)} 个商品")
                    self.progress_signal.emit(100)
                    
                finally:
                    await browser.close()
                
            self.finished_signal.emit(True)
            
        except Exception as e:
            self.log_signal.emit("error", f"选品失败: {str(e)}")
            import traceback
            self.log_signal.emit("error", f"堆栈: {traceback.format_exc()[:500]}")
            self.finished_signal.emit(False)
            
    def stop(self):
        self._running = False


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("🔥 OZON 自动化选品工具")
        self.setMinimumSize(1000, 650)
        
        self.setStyleSheet("""
            QMainWindow {
                background-color: #ffffff;
            }
            
            QFrame#titleFrame {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #2563eb, stop:1 #1d4ed8);
                color: white;
                border-radius: 12px;
            }
            
            QFrame#titleFrame QLabel {
                color: white;
            }
            
            QGroupBox#paramsGroup {
                font-size: 14px;
                font-weight: bold;
                color: #374151;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                margin-top: 10px;
                padding-top: 15px;
                background-color: #fafafa;
            }
            
            QGroupBox#paramsGroup::title {
                subcontrol-origin: margin;
                left: 15px;
                padding: 0 10px;
                background-color: #fafafa;
            }
            
            QLabel {
                font-size: 13px;
                color: #4b5563;
            }
            
            QLineEdit, QDoubleSpinBox, QSpinBox {
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                background-color: white;
                color: #1f2937;
            }
            
            QLineEdit:focus, QDoubleSpinBox:focus, QSpinBox:focus {
                border-color: #3b82f6;
                outline: none;
            }
            
            QPushButton#startBtn {
                background-color: #10b981;
                color: white;
                padding: 10px 30px;
                font-size: 14px;
                font-weight: bold;
                border: none;
                border-radius: 8px;
            }
            
            QPushButton#startBtn:hover {
                background-color: #059669;
            }
            
            QPushButton#stopBtn {
                background-color: #ef4444;
                color: white;
                padding: 10px 30px;
                font-size: 14px;
                font-weight: bold;
                border: none;
                border-radius: 8px;
            }
            
            QPushButton#stopBtn:hover {
                background-color: #dc2626;
            }
            
            QProgressBar {
                height: 12px;
                border-radius: 6px;
                background-color: #e5e7eb;
            }
            
            QProgressBar::chunk {
                background-color: #10b981;
                border-radius: 6px;
            }
            
            QTextEdit#logText {
                background-color: #1f2937;
                color: #e5e7eb;
                font-family: Consolas, Monaco, monospace;
                font-size: 12px;
                border: none;
                border-radius: 8px;
            }
            
            QGroupBox#logGroup {
                font-size: 14px;
                font-weight: bold;
                color: #374151;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                margin-top: 10px;
                padding-top: 15px;
                background-color: #fafafa;
            }
        """)
        
        self.worker = None
        self._init_ui()
        
    def _init_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(15)
        
        # 标题栏
        title_frame = QFrame()
        title_frame.setObjectName("titleFrame")
        title_layout = QHBoxLayout(title_frame)
        title_layout.setContentsMargins(20, 20, 20, 20)
        
        title_label = QLabel("🔥 OZON 自动化选品工具")
        title_label.setFont(QFont("Microsoft YaHei", 18, QFont.Bold))
        title_layout.addWidget(title_label)
        
        title_layout.addStretch()
        
        status_label = QLabel("✓ 系统就绪")
        status_label.setFont(QFont("Microsoft YaHei", 12))
        title_layout.addWidget(status_label)
        
        layout.addWidget(title_frame)
        
        # 参数配置区
        params_group = QGroupBox("⚙️ 筛选条件")
        params_group.setObjectName("paramsGroup")
        params_layout = QGridLayout(params_group)
        params_layout.setContentsMargins(20, 20, 20, 20)
        params_layout.setSpacing(15)
        
        row = 0
        
        # 关键词
        params_layout.addWidget(QLabel("搜索关键词:"), row, 0, Qt.AlignRight | Qt.AlignVCenter)
        self.kw_input = QLineEdit()
        self.kw_input.setText("электроника")
        self.kw_input.setPlaceholderText("输入俄语搜索关键词")
        self.kw_input.setMinimumWidth(250)
        params_layout.addWidget(self.kw_input, row, 1, 1, 3)
        
        row += 1
        
        # 价格范围
        params_layout.addWidget(QLabel("价格范围(₽):"), row, 0, Qt.AlignRight | Qt.AlignVCenter)
        self.min_price = QDoubleSpinBox()
        self.min_price.setRange(0, 100000)
        self.min_price.setValue(100)
        self.min_price.setMinimumWidth(120)
        params_layout.addWidget(self.min_price, row, 1)
        
        dash_label = QLabel("-")
        dash_label.setAlignment(Qt.AlignCenter)
        params_layout.addWidget(dash_label, row, 2)
        
        self.max_price = QDoubleSpinBox()
        self.max_price.setRange(0, 100000)
        self.max_price.setValue(5000)
        self.max_price.setMinimumWidth(120)
        params_layout.addWidget(self.max_price, row, 3)
        
        row += 1
        
        # 销量范围
        params_layout.addWidget(QLabel("销量范围:"), row, 0, Qt.AlignRight | Qt.AlignVCenter)
        self.min_sales = QSpinBox()
        self.min_sales.setRange(0, 1000)
        self.min_sales.setValue(10)
        self.min_sales.setMinimumWidth(120)
        params_layout.addWidget(self.min_sales, row, 1)
        
        dash_label2 = QLabel("-")
        dash_label2.setAlignment(Qt.AlignCenter)
        params_layout.addWidget(dash_label2, row, 2)
        
        self.max_sales = QSpinBox()
        self.max_sales.setRange(0, 1000)
        self.max_sales.setValue(200)
        self.max_sales.setMinimumWidth(120)
        params_layout.addWidget(self.max_sales, row, 3)
        
        row += 1
        
        # 汇率
        params_layout.addWidget(QLabel("汇率(₽→¥):"), row, 0, Qt.AlignRight | Qt.AlignVCenter)
        self.exchange_rate = QDoubleSpinBox()
        self.exchange_rate.setRange(1, 20)
        self.exchange_rate.setValue(12.0)
        self.exchange_rate.setDecimals(2)
        self.exchange_rate.setMinimumWidth(120)
        params_layout.addWidget(self.exchange_rate, row, 1)
        
        # 佣金
        params_layout.addWidget(QLabel("佣金比例(%):"), row, 2, Qt.AlignRight | Qt.AlignVCenter)
        self.commission_rate = QDoubleSpinBox()
        self.commission_rate.setRange(0, 50)
        self.commission_rate.setValue(15)
        self.commission_rate.setMinimumWidth(120)
        params_layout.addWidget(self.commission_rate, row, 3)
        
        row += 1
        
        # 运费
        params_layout.addWidget(QLabel("运费(¥):"), row, 0, Qt.AlignRight | Qt.AlignVCenter)
        self.shipping_cost = QDoubleSpinBox()
        self.shipping_cost.setRange(0, 100)
        self.shipping_cost.setValue(15)
        self.shipping_cost.setMinimumWidth(120)
        params_layout.addWidget(self.shipping_cost, row, 1)
        
        layout.addWidget(params_group)
        
        # 进度条
        self.progress_bar = QProgressBar()
        layout.addWidget(self.progress_bar)
        
        # 日志面板
        log_group = QGroupBox("📝 操作日志")
        log_group.setObjectName("logGroup")
        log_layout = QVBoxLayout(log_group)
        log_layout.setContentsMargins(15, 15, 15, 15)
        
        self.log_text = QTextEdit()
        self.log_text.setObjectName("logText")
        self.log_text.setReadOnly(True)
        log_layout.addWidget(self.log_text)
        
        layout.addWidget(log_group, stretch=1)
        
        # 底部按钮
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        
        self.btn_start = QPushButton("▶ 开始选品")
        self.btn_start.setObjectName("startBtn")
        self.btn_start.clicked.connect(self._start_selection)
        
        self.btn_stop = QPushButton("⏹ 停止")
        self.btn_stop.setObjectName("stopBtn")
        self.btn_stop.clicked.connect(self._stop_selection)
        self.btn_stop.setEnabled(False)
        
        btn_layout.addWidget(self.btn_start)
        btn_layout.addWidget(self.btn_stop)
        
        layout.addLayout(btn_layout)
        
        self._log("success", "应用程序启动成功")
        self._log("info", "设置筛选条件后点击开始选品")
        
    def _get_params(self):
        return {
            "keywords": self.kw_input.text(),
            "min_price": self.min_price.value(),
            "max_price": self.max_price.value(),
            "min_sales": self.min_sales.value(),
            "max_sales": self.max_sales.value(),
            "exchange_rate": self.exchange_rate.value(),
            "commission_rate": self.commission_rate.value(),
            "shipping_cost": self.shipping_cost.value()
        }
        
    def _log(self, level, message):
        color_map = {
            "success": "#4ade80",
            "info": "#60a5fa",
            "warning": "#fbbf24",
            "error": "#f87171"
        }
        color = color_map.get(level, "#e5e7eb")
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.append(f'<span style="color:{color}">[{timestamp}] [{level.upper()}] {message}</span>')
        self.log_text.verticalScrollBar().setValue(self.log_text.verticalScrollBar().maximum())
        
    def _start_selection(self):
        self.btn_start.setEnabled(False)
        self.btn_stop.setEnabled(True)
        self.progress_bar.setValue(0)
        
        self.worker = SelectionWorker(self._get_params())
        self.worker.log_signal.connect(self._log)
        self.worker.progress_signal.connect(self.progress_bar.setValue)
        self.worker.finished_signal.connect(self._on_finish)
        self.worker.start()
        
    def _stop_selection(self):
        if self.worker:
            self.worker.stop()
            self._log("info", "正在停止...")
            
    def _on_finish(self, success):
        self.btn_start.setEnabled(True)
        self.btn_stop.setEnabled(False)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())