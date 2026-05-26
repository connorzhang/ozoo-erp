from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QFileDialog, QFrame, QFormLayout
)
from PySide6.QtCore import Qt
from typing import Dict, Any


class ConfigTab(QWidget):
    """文件配置 Tab"""
    
    def __init__(self, logger):
        super().__init__()
        self.logger = logger
        self._init_ui()
        
    def _init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 20, 24, 24)
        layout.setSpacing(20)
        
        # 标题
        title = QLabel("📁 文件配置")
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #1f2937;")
        layout.addWidget(title)
        
        # 说明
        desc = QLabel("配置选品所需的Excel文件路径和浏览器下载目录")
        desc.setStyleSheet("color: #6b7280; font-size: 13px;")
        layout.addWidget(desc)
        
        # 表单区域容器
        form_container = QFrame()
        form_container.setStyleSheet("""
            QFrame { background: white; border: 1px solid #e5e7eb; border-radius: 12px; }
        """)
        form_layout = QVBoxLayout(form_container)
        form_layout.setContentsMargins(24, 20, 24, 20)
        form_layout.setSpacing(18)
        
        # 店铺表
        self.shop_path = self._create_path_input("店铺表", "选择店铺表 Excel 文件路径")
        form_layout.addWidget(self.shop_path)
        
        # 店铺名称表
        self.shop_name_path = self._create_path_input("店铺名称表", "选择店铺名称表 Excel 文件路径")
        form_layout.addWidget(self.shop_name_path)
        
        # 选品表
        self.selection_path = self._create_path_input("选品表", "选择选品表 Excel 文件路径")
        form_layout.addWidget(self.selection_path)
        
        # 浏览器下载位置
        self.download_path = self._create_path_input("浏览器下载位置", "选择浏览器下载目录路径", is_dir=True)
        form_layout.addWidget(self.download_path)
        
        layout.addWidget(form_container)
        layout.addStretch()
        
    def _create_path_input(self, label: str, placeholder: str, is_dir: bool = False) -> QWidget:
        """创建路径输入控件"""
        widget = QWidget()
        layout = QHBoxLayout(widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(12)
        
        # 标签
        lbl = QLabel(label + "：")
        lbl.setStyleSheet("font-size: 13px; color: #4b5563; font-weight: 500;")
        lbl.setMinimumWidth(140)
        
        # 输入框
        input_field = QLineEdit()
        input_field.setPlaceholderText(placeholder)
        input_field.setMinimumHeight(42)
        input_field.setStyleSheet("""
            QLineEdit { padding: 9px 16px; border: 1px solid #d1d5db; border-radius: 8px; background: #fafafa; font-size: 13px; }
            QLineEdit:focus { border-color: #3b82f6; background: white; outline: none; }
        """)
        
        # 浏览按钮
        browse_btn = QPushButton("浏览...")
        browse_btn.setMinimumHeight(42)
        browse_btn.setMinimumWidth(90)
        browse_btn.setStyleSheet("""
            QPushButton { padding: 9px 22px; background-color: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; }
            QPushButton:hover { background-color: #2563eb; }
            QPushButton:pressed { background-color: #1d4ed8; }
        """)
        browse_btn.clicked.connect(lambda: self._browse_path(input_field, is_dir))
        
        layout.addWidget(lbl)
        layout.addWidget(input_field, stretch=1)
        layout.addWidget(browse_btn)
        
        widget.input_field = input_field
        return widget
        
    def _browse_path(self, input_field: QLineEdit, is_dir: bool):
        """浏览文件或目录"""
        if is_dir:
            path = QFileDialog.getExistingDirectory(self, "选择目录")
        else:
            path, _ = QFileDialog.getOpenFileName(
                self, "选择文件", "", "Excel Files (*.xlsx *.xls);;All Files (*)"
            )
        if path:
            input_field.setText(path)
            
    def get_config(self) -> Dict[str, str]:
        """获取配置"""
        return {
            "shop_table": self.shop_path.input_field.text(),
            "shop_name_table": self.shop_name_path.input_field.text(),
            "selection_table": self.selection_path.input_field.text(),
            "download_dir": self.download_path.input_field.text()
        }
