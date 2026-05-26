from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QGridLayout, QScrollArea, QFrame, QFormLayout
)
from PySide6.QtCore import Qt
from typing import Dict, Any


class ParamsTab(QWidget):
    """核心参数 Tab"""
    
    def __init__(self, logger):
        super().__init__()
        self.logger = logger
        self._init_ui()
        
    def _init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 20, 24, 24)
        layout.setSpacing(16)
        
        # 标题
        title = QLabel("⚙️ 核心参数")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #1f2937;")
        layout.addWidget(title)
        
        # 滚动区域
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        scroll.setFrameShape(QScrollArea.NoFrame)
        
        scroll_content = QWidget()
        scroll_layout = QVBoxLayout(scroll_content)
        scroll_layout.setSpacing(16)
        
        # 第一组：选品范围
        self._add_group(scroll_layout, "📊 选品范围", [
            ("月销量范围 - 最小", "sales_month_min", "0"),
            ("月销量范围 - 最大", "sales_month_max", "999"),
            ("跟卖人数范围 - 最小", "competitors_min", "0"),
            ("跟卖人数范围 - 最大", "competitors_max", "50"),
            ("上架时间范围 - 最小", "listing_days_min", "0"),
            ("上架时间范围 - 最大", "listing_days_max", "365"),
        ])
        
        # 第二组：商品属性
        self._add_group(scroll_layout, "📦 商品属性", [
            ("重量范围 - 最小 (g)", "weight_min", "0"),
            ("重量范围 - 最大 (g)", "weight_max", "25000"),
            ("商品价格范围 - 最小 (₽)", "price_min", "0"),
            ("商品价格范围 - 最大 (₽)", "price_max", "8888"),
            ("评分范围 - 最小", "rating_min", "0"),
            ("评分范围 - 最大", "rating_max", "5"),
        ])
        
        # 第三组：财务参数
        self._add_group(scroll_layout, "💰 财务参数", [
            ("汇率", "exchange_rate", "12.0"),
            ("佣金比例 (%)", "commission_rate", "12"),
            ("最低利润率 (%)", "min_profit_rate", "1.0"),
            ("图片相似度", "image_similarity", "0.8"),
            ("退货+提现费率", "return_rate", "0.03"),
            ("其它费用", "other_costs", "0"),
        ])
        
        scroll_layout.addStretch()
        scroll.setWidget(scroll_content)
        layout.addWidget(scroll)
        
    def _add_group(self, layout: QVBoxLayout, group_title: str, fields: list):
        """添加一组参数"""
        group_widget = QFrame()
        group_widget.setStyleSheet("""
            QFrame { background: white; border: 1px solid #e5e7eb; border-radius: 12px; }
        """)
        group_layout = QVBoxLayout(group_widget)
        group_layout.setContentsMargins(20, 16, 20, 16)
        group_layout.setSpacing(12)
        
        title = QLabel(group_title)
        title.setStyleSheet("font-size: 14px; font-weight: 700; color: #1f2937;")
        group_layout.addWidget(title)
        
        grid = QGridLayout()
        grid.setSpacing(14)
        grid.setContentsMargins(0, 4, 0, 0)
        
        for i, (label, key, default) in enumerate(fields):
            row = i // 2
            col = (i % 2) * 2
            
            lbl = QLabel(label)
            lbl.setStyleSheet("font-size: 12px; color: #6b7280; font-weight: 500;")
            
            input_field = QLineEdit(str(default))
            input_field.setObjectName(key)
            input_field.setMinimumHeight(40)
            input_field.setStyleSheet("""
                QLineEdit { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 8px; background: #fafafa; font-size: 13px; }
                QLineEdit:focus { border-color: #3b82f6; background: white; outline: none; }
            """)
            
            grid.addWidget(lbl, row, col)
            grid.addWidget(input_field, row, col + 1)
        
        group_layout.addLayout(grid)
        layout.addWidget(group_widget)
        
    def get_config(self) -> Dict[str, Any]:
        """获取配置"""
        config = {}
        for widget in self.findChildren(QLineEdit):
            key = widget.objectName()
            if key:
                value = widget.text()
                # 尝试转换为数字
                try:
                    if "." in value:
                        config[key] = float(value)
                    else:
                        config[key] = int(value)
                except ValueError:
                    config[key] = value
        return config
