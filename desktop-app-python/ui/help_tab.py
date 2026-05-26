from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QScrollArea
)
from PySide6.QtCore import Qt


class HelpTab(QWidget):
    """使用说明 Tab"""
    
    def __init__(self, logger):
        super().__init__()
        self.logger = logger
        self._init_ui()
        
    def _init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # 标题
        title = QLabel("📖 使用说明")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #1a1a2e; margin-bottom: 15px;")
        layout.addWidget(title)
        
        # 滚动区域
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        
        scroll_content = QWidget()
        scroll_layout = QVBoxLayout(scroll_content)
        
        # 使用说明
        help_text = """
        <h3 style="color: #1e3a8a; margin-top: 15px;">使用前准备</h3>
        <ol style="color: #475569; line-height: 2;">
            <li>需要一个店铺表，在店铺表里先填写一些 OZON 的店铺链接，让程序有一个启动的入口</li>
            <li>店铺名称表：这个表不用我们手动操作，一个空表即可，只需在第一行写入数据</li>
            <li>选品表：选出来的品，软件会自动写入这个表，一个空表即可</li>
            <li>浏览器下载位置：需要设置浏览器的下载位置，要和浏览器的下载位置一致</li>
        </ol>
        
        <h3 style="color: #1e3a8a; margin-top: 20px;">核心参数说明</h3>
        <p style="color: #475569; line-height: 1.8;">
            这里面是设置选什么样的品，按照你的选品逻辑设置即可。
            佣金比例设置的意思是：正常情况下，我们根据产品的价格选择执行插件显示的佣金比例，但有时候，网页不会显示，我们就会根据这个佣金比例来计算利润等。
        </p>
        
        <h3 style="color: #1e3a8a; margin-top: 20px;">物流渠道</h3>
        <p style="color: #475569; line-height: 1.8;">
            设置不同物流类型的运费价格，用于利润计算。
        </p>
        """
        
        help_label = QLabel(help_text)
        help_label.setWordWrap(True)
        help_label.setStyleSheet("font-size: 14px; line-height: 1.8;")
        help_label.setTextFormat(Qt.RichText)
        
        scroll_layout.addWidget(help_label)
        scroll_layout.addStretch()
        scroll.setWidget(scroll_content)
        layout.addWidget(scroll)
