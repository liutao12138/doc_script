"""
错误处理模块
"""
import traceback
import requests
from typing import Optional, Dict, Any
from loguru import logger
from .database import db_manager
from .config import MAX_RETRIES

class ErrorHandler:
    """错误处理器类"""
    
    def __init__(self):
        self.max_retries = MAX_RETRIES
    
    def handle_task_error(self, error: Exception, file_id: str, task_name: str, 
                         retry_count: int = 0) -> Dict[str, Any]:
        """
        处理任务错误
        
        Args:
            error: 异常对象
            file_id: 文件ID
            task_name: 任务名称
            retry_count: 重试次数
            
        Returns:
            错误处理结果
        """
        error_info = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'file_id': file_id,
            'task_name': task_name,
            'retry_count': retry_count,
            'traceback': traceback.format_exc()
        }
        
        # 记录错误日志
        logger.error(f"任务错误: {task_name}", extra=error_info)
        
        # 记录到数据库
        db_manager.add_log(
            file_id,
            "ERROR",
            f"任务错误: {task_name} - {str(error)}",
            extra_data=error_info
        )
        
        # 判断是否应该重试
        should_retry = self._should_retry(error, retry_count)
        
        if should_retry:
            error_info['should_retry'] = True
            error_info['retry_delay'] = self._calculate_retry_delay(retry_count)
            logger.info(f"任务将重试: {task_name}, 重试次数: {retry_count + 1}")
        else:
            error_info['should_retry'] = False
            # 更新文件状态为失败
            db_manager.update_status(file_id, "failed", str(error))
            logger.error(f"任务失败，不再重试: {task_name}")
        
        return error_info
    
    def _should_retry(self, error: Exception, retry_count: int) -> bool:
        """判断是否应该重试"""
        # 检查重试次数
        if retry_count >= self.max_retries:
            return False
        
        # 检查错误类型
        retryable_errors = (
            ConnectionError,
            TimeoutError,
            requests.exceptions.RequestException,
            requests.exceptions.ConnectionError,
            requests.exceptions.Timeout,
            requests.exceptions.HTTPError
        )
        
        if isinstance(error, retryable_errors):
            return True
        
        # 检查错误消息中的关键词
        error_message = str(error).lower()
        retryable_keywords = [
            'timeout',
            'connection',
            'network',
            'temporary',
            'service unavailable',
            'internal server error',
            'bad gateway',
            'gateway timeout'
        ]
        
        for keyword in retryable_keywords:
            if keyword in error_message:
                return True
        
        return False
    
    def _calculate_retry_delay(self, retry_count: int) -> int:
        """计算重试延迟时间（秒）"""
        # 指数退避策略
        base_delay = 60  # 基础延迟60秒
        max_delay = 600  # 最大延迟10分钟
        
        delay = min(base_delay * (2 ** retry_count), max_delay)
        return delay
    
    def handle_file_processing_error(self, error: Exception, file_id: str, 
                                   processing_step: str) -> Dict[str, Any]:
        """
        处理文件处理错误
        
        Args:
            error: 异常对象
            file_id: 文件ID
            processing_step: 处理步骤
            
        Returns:
            错误处理结果
        """
        error_info = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'file_id': file_id,
            'processing_step': processing_step,
            'traceback': traceback.format_exc()
        }
        
        # 记录错误日志
        logger.error(f"文件处理错误: {processing_step}", extra=error_info)
        
        # 记录到数据库
        db_manager.add_log(
            file_id,
            "ERROR",
            f"文件处理错误: {processing_step} - {str(error)}",
            extra_data=error_info
        )
        
        # 更新文件状态
        db_manager.update_status(file_id, "failed", str(error))
        
        return error_info
    
    def handle_system_error(self, error: Exception, component: str) -> Dict[str, Any]:
        """
        处理系统错误
        
        Args:
            error: 异常对象
            component: 组件名称
            
        Returns:
            错误处理结果
        """
        error_info = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'component': component,
            'traceback': traceback.format_exc()
        }
        
        # 记录错误日志
        logger.error(f"系统错误: {component}", extra=error_info)
        
        # 记录到数据库
        db_manager.add_log(
            "system",
            "ERROR",
            f"系统错误: {component} - {str(error)}",
            extra_data=error_info
        )
        
        return error_info
    
    def get_error_summary(self, file_id: str = None) -> Dict[str, Any]:
        """获取错误摘要"""
        try:
            if file_id:
                # 获取特定文件的错误
                logs = db_manager.get_file_logs(file_id)
                error_logs = [log for log in logs if log.log_level == "ERROR"]
            else:
                # 获取系统错误
                from .database import ProcessingLog
                error_logs = db_manager.session.query(ProcessingLog).filter_by(
                    log_level="ERROR"
                ).all()
            
            error_summary = {
                'total_errors': len(error_logs),
                'error_types': {},
                'recent_errors': []
            }
            
            # 统计错误类型
            for log in error_logs:
                if log.extra_data:
                    try:
                        import json
                        extra_data = json.loads(log.extra_data)
                        error_type = extra_data.get('error_type', 'Unknown')
                        error_summary['error_types'][error_type] = error_summary['error_types'].get(error_type, 0) + 1
                    except:
                        pass
            
            # 获取最近的错误
            recent_errors = error_logs[-10:] if len(error_logs) > 10 else error_logs
            for log in recent_errors:
                error_summary['recent_errors'].append({
                    'timestamp': log.timestamp.isoformat(),
                    'file_id': log.file_id,
                    'message': log.message,
                    'task_id': log.task_id
                })
            
            return error_summary
            
        except Exception as e:
            logger.error(f"获取错误摘要失败: {str(e)}")
            return {'error': str(e)}
    
    def cleanup_failed_files(self, older_than_hours: int = 24) -> int:
        """清理失败的文件记录"""
        try:
            from datetime import datetime, timedelta
            from .database import FileProcessingStatus
            
            cutoff_time = datetime.utcnow() - timedelta(hours=older_than_hours)
            
            # 获取需要清理的失败文件
            failed_files = db_manager.session.query(FileProcessingStatus).filter(
                FileProcessingStatus.status == "failed",
                FileProcessingStatus.updated_at < cutoff_time
            ).all()
            
            cleaned_count = 0
            for file_status in failed_files:
                try:
                    # 清理相关文件
                    if file_status.download_path:
                        import os
                        if os.path.exists(file_status.download_path):
                            os.remove(file_status.download_path)
                    
                    if file_status.markdown_path:
                        import os
                        if os.path.exists(file_status.markdown_path):
                            os.remove(file_status.markdown_path)
                    
                    # 删除数据库记录
                    db_manager.session.delete(file_status)
                    cleaned_count += 1
                    
                except Exception as e:
                    logger.error(f"清理文件失败: {file_status.file_id}, 错误: {str(e)}")
            
            db_manager.session.commit()
            logger.info(f"清理了 {cleaned_count} 个失败的文件记录")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"清理失败文件时出错: {str(e)}")
            return 0

# 全局错误处理器实例
error_handler = ErrorHandler()
