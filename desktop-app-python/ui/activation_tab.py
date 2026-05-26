from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QFrame
)
from PySide6.QtCore import Qt


class ActivationTab(QWidget):
    """激活码 Tab"""
    
    def __init__(self, logger):
        super().__init__()
        self.logger = logger
        self.activated = False
        self._init_ui()
        
    def _init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # 居中区域
        center_layout = QVBoxLayout()
        center_layout.addStretch()
        
        # 图标
        icon_label = QLabel("🔑")
        icon_label.setAlignment(Qt.AlignCenter)
        icon_label.setStyleSheet("font-size: 48px; margin-bottom: 10px;")
        center_layout.addWidget(icon_label)
        
        # 标题
        title = QLabel("软件激活")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("font-size: 20px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px;")
        center_layout.addWidget(title)
        
        # 已激活状态
        self.status_label = QLabel("请输入激活码")
        self.status_label.setAlignment(Qt.AlignCenter)
        self.status_label.setStyleSheet("color: #64748b; margin-bottom: 30px;")
        center_layout.addWidget(self.status_label)
        
        # 输入区域
        input_layout = QHBoxLayout()
        input_layout.setContentsMargins(50, 0, 50, 0)
        
        lbl = QLabel("激活码:")
        lbl.setStyleSheet("font-size: 14px; color: #1a1a2e;")
        
        self.code_input = QLineEdit()
        self.code_input.setPlaceholderText("请输入激活码...")
        self.code_input.setMinimumHeight(42)
        self.code_input.setStyleSheet("""
            QLineEdit { padding: 10px 15px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
            QLineEdit:focus { border-color: #3b82f6; }
        """)
        
        btn_activate = QPushButton("激活")
        btn_activate.setMinimumHeight(42)
        btn_activate.setMinimumWidth(100)
        btn_activate.setStyleSheet("""
            QPushButton { padding: 10px 25px; background-color: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; }
            QPushButton:hover { background-color: #2563eb; }
        """)
        btn_activate.clicked.connect(self._activate)
        
        input_layout.addWidget(lbl)
        input_layout.addWidget(self.code_input, stretch=1)
        input_layout.addWidget(btn_activate)
        
        center_layout.addLayout(input_layout)
        
        # 测试提示
        tip = QLabel("测试激活码：TEST123456")
        tip.setAlignment(Qt.AlignCenter)
        tip.setStyleSheet("color: #94a3b8; font-size: 12px; margin-top: 20px;")
        center_layout.addWidget(tip)
        
        center_layout.addStretch()
        layout.addLayout(center_layout)
        
    def _activate(self):
        """激活软件"""
        code = self.code_input.text().strip()
        if not code:
            self.logger.warning("请输入激活码")
            return
            
        self.logger.info("正在验证激活码...")
        
        # 简单的测试逻辑
        if code == "TEST123456":
            self.activated = True
            self.status_label.setText("✅ 软件已激活")
            self.status_label.setStyleSheet("color: #10b981; font-weight: bold; font-size: 14px;")
            self.code_input.setEnabled(False)
            self.logger.success("激活成功")
        else:
            self.logger.error("激活码无效，请联系客服")
