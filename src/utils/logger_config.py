"""
日志配置模块
"""
import os
import sys
from pathlib import Path
from loguru import logger
from ..core.config import LOG_LEVEL, LOG_FILE

class LoggerConfig:
    """日志配置类"""
    
    def __init__(self):
        self.log_level = LOG_LEVEL
        self.log_file = LOG_FILE
        self.setup_logger()
    
    def setup_logger(self):
        """设置日志配置"""
        # 移除默认处理器
        logger.remove()
        
        # 创建日志目录
        log_path = Path(self.log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 控制台输出格式
        console_format = (
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
            "<level>{message}</level>"
        )
        
        # 文件输出格式
        file_format = (
            "{time:YYYY-MM-DD HH:mm:ss} | "
            "{level: <8} | "
            "{name}:{function}:{line} | "
            "{message}"
        )
        
        # 添加控制台处理器
        logger.add(
            sys.stdout,
            format=console_format,
            level=self.log_level,
            colorize=True,
            backtrace=True,
            diagnose=True
        )
        
        # 添加文件处理器 - 所有日志
        logger.add(
            self.log_file,
            format=file_format,
            level="DEBUG",
            rotation="100 MB",
            retention="30 days",
            compression="zip",
            backtrace=True,
            diagnose=True,
            encoding="utf-8"
        )
        
        # 添加错误日志文件
        error_log_file = str(log_path.parent / "error.log")
        logger.add(
            error_log_file,
            format=file_format,
            level="ERROR",
            rotation="50 MB",
            retention="90 days",
            compression="zip",
            backtrace=True,
            diagnose=True,
            encoding="utf-8"
        )
        
        # 添加处理日志文件
        processing_log_file = str(log_path.parent / "processing.log")
        logger.add(
            processing_log_file,
            format=file_format,
            level="INFO",
            rotation="50 MB",
            retention="30 days",
            compression="zip",
            encoding="utf-8",
            filter=lambda record: "file_id" in record["extra"] or "system" in record["extra"]
        )
        
        logger.info("日志系统初始化完成")
        logger.info(f"日志级别: {self.log_level}")
        logger.info(f"日志文件: {self.log_file}")
    
    def get_logger(self, name: str = None):
        """获取日志器"""
        if name:
            return logger.bind(name=name)
        return logger
    
    def log_task_start(self, task_name: str, file_id: str = None, **kwargs):
        """记录任务开始"""
        extra_data = {"task_name": task_name}
        if file_id:
            extra_data["file_id"] = file_id
        extra_data.update(kwargs)
        
        logger.info(f"任务开始: {task_name}", extra=extra_data)
    
    def log_task_end(self, task_name: str, file_id: str = None, success: bool = True, **kwargs):
        """记录任务结束"""
        extra_data = {"task_name": task_name, "success": success}
        if file_id:
            extra_data["file_id"] = file_id
        extra_data.update(kwargs)
        
        status = "成功" if success else "失败"
        logger.info(f"任务结束: {task_name} - {status}", extra=extra_data)
    
    def log_error(self, error: Exception, file_id: str = None, task_name: str = None, **kwargs):
        """记录错误"""
        extra_data = {}
        if file_id:
            extra_data["file_id"] = file_id
        if task_name:
            extra_data["task_name"] = task_name
        extra_data.update(kwargs)
        
        logger.error(f"错误: {str(error)}", extra=extra_data)
    
    def log_processing_step(self, step: str, file_id: str, **kwargs):
        """记录处理步骤"""
        extra_data = {"file_id": file_id, "step": step}
        extra_data.update(kwargs)
        
        logger.info(f"处理步骤: {step}", extra=extra_data)
    
    def log_performance(self, operation: str, file_id: str, duration: float, **kwargs):
        """记录性能信息"""
        extra_data = {"file_id": file_id, "operation": operation, "duration": duration}
        extra_data.update(kwargs)
        
        logger.info(f"性能统计: {operation} 耗时 {duration:.2f}s", extra=extra_data)

# 全局日志配置实例
log_config = LoggerConfig()

# 导出日志器
app_logger = log_config.get_logger("doc_processing")
