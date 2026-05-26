from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QGridLayout, QScrollArea, QFrame
)
from PySide6.QtCore import Qt
from typing import Dict, Any


class LogisticsTab(QWidget):
    """物流渠道 Tab"""
    
    def __init__(self, logger):
        super().__init__()
        self.logger = logger
        self.channels = [
            {"id": "extra_small", "name": "Extra Small", "desc": "超级轻小件"},
            {"id": "small", "name": "Small", "desc": "小件"},
            {"id": "premium_small", "name": "Premium Small", "desc": "高客单价小件"},
            {"id": "budget", "name": "Budget", "desc": "低客单价标准件"},
            {"id": "big", "name": "Big", "desc": "大件"},
            {"id": "premium_big", "name": "Premium Big", "desc": "高客单价大件"},
        ]
        self._init_ui()
        
    def _init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 20, 24, 24)
        layout.setSpacing(16)
        
        # 标题
        title = QLabel("📦 物流渠道")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #1f2937;")
        layout.addWidget(title)
        
        # 滚动区域
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        scroll.setFrameShape(QScrollArea.NoFrame)
        
        scroll_content = QWidget()
        scroll_layout = QVBoxLayout(scroll_content)
        scroll_layout.setSpacing(14)
        
        # 网格布局
        grid = QGridLayout()
        grid.setSpacing(14)
        grid.setContentsMargins(0, 4, 0, 0)
        
        for i, channel in enumerate(self.channels):
            row = i // 2
            col = i % 2
            card = self._create_channel_card(channel)
            grid.addWidget(card, row, col)
        
        scroll_layout.addLayout(grid)
        scroll_layout.addStretch()
        scroll.setWidget(scroll_content)
        layout.addWidget(scroll)
        
    def _create_channel_card(self, channel: dict) -> QWidget:
        """创建物流渠道卡片"""
        card = QFrame()
        card.setStyleSheet("""
            QFrame { background: white; border: 1px solid #e5e7eb; border-radius: 12px; }
        """)
        layout = QVBoxLayout(card)
        layout.setContentsMargins(18, 16, 18, 16)
        layout.setSpacing(12)
        
        # 标题
        title_layout = QHBoxLayout()
        name_label = QLabel(channel["name"])
        name_label.setStyleSheet("font-size: 14px; font-weight: 700; color: #1f2937;")
        desc_label = QLabel(channel["desc"])
        desc_label.setStyleSheet("font-size: 11px; color: #9ca3af;")
        title_layout.addWidget(name_label)
        title_layout.addStretch()
        title_layout.addWidget(desc_label)
        layout.addLayout(title_layout)
        
        # 表单
        form_layout = QGridLayout()
        form_layout.setSpacing(10)
        form_layout.setContentsMargins(0, 4, 0, 0)
        
        # 每公斤价格
        lbl1 = QLabel("每公斤价格 (₽):")
        lbl1.setStyleSheet("font-size: 12px; color: #6b7280;")
        input_price_kg = QLineEdit("0.0000")
        input_price_kg.setObjectName(f"{channel['id']}_price_kg")
        input_price_kg.setMinimumHeight(38)
        input_price_kg.setStyleSheet("""
            QLineEdit { padding: 7px 12px; border: 1px solid #d1d5db; border-radius: 8px; background: #fafafa; font-size: 13px; }
            QLineEdit:focus { border-color: #3b82f6; background: white; outline: none; }
        """)
        
        # 每票价格
        lbl2 = QLabel("每票价格 (₽):")
        lbl2.setStyleSheet("font-size: 12px; color: #6b7280;")
        input_price_per = QLineEdit("0.00")
        input_price_per.setObjectName(f"{channel['id']}_price_per")
        input_price_per.setMinimumHeight(38)
        input_price_per.setStyleSheet("""
            QLineEdit { padding: 7px 12px; border: 1px solid #d1d5db; border-radius: 8px; background: #fafafa; font-size: 13px; }
            QLineEdit:focus { border-color: #3b82f6; background: white; outline: none; }
        """)
        
        form_layout.addWidget(lbl1, 0, 0)
        form_layout.addWidget(input_price_kg, 0, 1)
        form_layout.addWidget(lbl2, 1, 0)
        form_layout.addWidget(input_price_per, 1, 1)
        
        layout.addLayout(form_layout)
        
        channel["input_price_kg"] = input_price_kg
        channel["input_price_per"] = input_price_per
        return card
        
    def get_config(self) -> Dict[str, Any]:
        """获取配置"""
        config = {"channels": []}
        for channel in self.channels:
            config["channels"].append({
                "id": channel["id"],
                "name": channel["name"],
                "price_kg": float(channel["input_price_kg"].text()),
                "price_per": float(channel["input_price_per"].text())
            })
        return config
