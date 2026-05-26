from PySide6.QtCore import QObject, Signal
from datetime import datetime
from typing import List


class Logger(QObject):
    """日志管理器"""
    log_signal = Signal(str, str)  # level, message
    
    def __init__(self):
        super().__init__()
        self._logs: List[dict] = []
        self._max_logs = 1000
        
    def success(self, message: str):
        """记录成功日志"""
        self._log("success", message)
        
    def info(self, message: str):
        """记录信息日志"""
        self._log("info", message)
        
    def warning(self, message: str):
        """记录警告日志"""
        self._log("warning", message)
        
    def error(self, message: str):
        """记录错误日志"""
        self._log("error", message)
        
    def _log(self, level: str, message: str):
        """记录日志"""
        log_entry = {
            "timestamp": datetime.now(),
            "level": level,
            "message": message
        }
        self._logs.append(log_entry)
        if len(self._logs) > self._max_logs:
            self._logs.pop(0)
        self.log_signal.emit(level, message)
        
    def get_logs(self) -> List[dict]:
        """获取所有日志"""
        return self._logs
        
    def clear(self):
        """清空日志"""
        self._logs = []
