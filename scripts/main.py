"""
主执行脚本
"""
import argparse
import sys
import time
import os
from typing import Dict, Any, List
from loguru import logger
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.core.database import db_manager
from src.services.file_operations import file_ops
from src.tasks.tasks import (
    query_files, download_file, convert_document, 
    chunk_document, vectorize_chunks, save_data,
    process_single_file, retry_failed_files
)
from src.core.error_handler import error_handler
from src.utils.logger_config import app_logger

class DocumentProcessor:
    """文档处理器主类"""
    
    def __init__(self):
        self.app_logger = app_logger
    
    def query_and_process_files(self, query_params: Dict[str, Any] = None, 
                              use_semantic: bool = False) -> Dict[str, Any]:
        """
        查询文件并开始处理
        
        Args:
            query_params: 查询参数
            use_semantic: 是否使用语义切片
            
        Returns:
            处理结果
        """
        try:
            self.app_logger.info("开始查询和处理文件")
            
            # 查询文件列表
            query_task = query_files.delay(query_params)
            query_result = query_task.get(timeout=300)
            
            if not query_result.get('success'):
                raise Exception(f"查询文件失败: {query_result.get('error')}")
            
            files_count = query_result.get('files_count', 0)
            self.app_logger.info(f"查询到 {files_count} 个文件，开始处理")
            
            # 获取待处理的文件
            pending_files = db_manager.get_pending_files()
            
            # 提交处理任务
            task_ids = []
            for file_status in pending_files:
                task = process_single_file.delay(file_status.file_id, use_semantic)
                task_ids.append(task.id)
                self.app_logger.info(f"提交文件处理任务: {file_status.file_id}, 任务ID: {task.id}")
            
            return {
                'success': True,
                'files_count': files_count,
                'pending_files': len(pending_files),
                'task_ids': task_ids
            }
            
        except Exception as e:
            error_info = error_handler.handle_system_error(e, "query_and_process_files")
            self.app_logger.error(f"查询和处理文件失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_info': error_info
            }
    
    def process_single_file_by_id(self, file_id: str, use_semantic: bool = False) -> Dict[str, Any]:
        """
        处理单个文件
        
        Args:
            file_id: 文件ID
            use_semantic: 是否使用语义切片
            
        Returns:
            处理结果
        """
        try:
            self.app_logger.info(f"开始处理单个文件: {file_id}")
            
            # 提交处理任务
            task = process_single_file.delay(file_id, use_semantic)
            result = task.get(timeout=1800)  # 30分钟超时
            
            self.app_logger.info(f"单文件处理完成: {file_id}, 结果: {result}")
            return result
            
        except Exception as e:
            error_info = error_handler.handle_system_error(e, "process_single_file_by_id")
            self.app_logger.error(f"单文件处理失败: {file_id}, 错误: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_info': error_info
            }
    
    def retry_failed_files(self, max_retry_count: int = 3) -> Dict[str, Any]:
        """
        重试失败的文件
        
        Args:
            max_retry_count: 最大重试次数
            
        Returns:
            重试结果
        """
        try:
            self.app_logger.info("开始重试失败的文件")
            
            # 提交重试任务
            task = retry_failed_files.delay(max_retry_count)
            result = task.get(timeout=600)
            
            self.app_logger.info(f"重试失败文件完成: {result}")
            return result
            
        except Exception as e:
            error_info = error_handler.handle_system_error(e, "retry_failed_files")
            self.app_logger.error(f"重试失败文件失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_info': error_info
            }
    
    def get_processing_status(self) -> Dict[str, Any]:
        """获取处理状态"""
        try:
            # 获取统计信息
            stats = db_manager.get_statistics()
            
            # 获取各状态的文件列表
            from src.core.database import FileProcessingStatus
            pending_files = db_manager.get_files_by_status("pending")
            processing_files = db_manager.session.query(FileProcessingStatus).filter(
                FileProcessingStatus.status.in_([
                    "downloading", "converting", "chunking", "vectorizing", "saving"
                ])
            ).all()
            completed_files = db_manager.get_files_by_status("completed")
            failed_files = db_manager.get_failed_files()
            
            return {
                'success': True,
                'statistics': stats,
                'files': {
                    'pending': [{'file_id': f.file_id, 'file_name': f.file_name} for f in pending_files],
                    'processing': [{'file_id': f.file_id, 'file_name': f.file_name, 'status': f.status} for f in processing_files],
                    'completed': [{'file_id': f.file_id, 'file_name': f.file_name} for f in completed_files],
                    'failed': [{'file_id': f.file_id, 'file_name': f.file_name, 'error': f.error_message} for f in failed_files]
                }
            }
            
        except Exception as e:
            error_info = error_handler.handle_system_error(e, "get_processing_status")
            self.app_logger.error(f"获取处理状态失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_info': error_info
            }
    
    def get_file_logs(self, file_id: str) -> Dict[str, Any]:
        """获取文件处理日志"""
        try:
            logs = db_manager.get_file_logs(file_id)
            return {
                'success': True,
                'file_id': file_id,
                'logs': [
                    {
                        'timestamp': log.timestamp.isoformat(),
                        'level': log.log_level,
                        'message': log.message,
                        'task_id': log.task_id,
                        'extra_data': log.extra_data
                    }
                    for log in logs
                ]
            }
        except Exception as e:
            error_info = error_handler.handle_system_error(e, "get_file_logs")
            self.app_logger.error(f"获取文件日志失败: {file_id}, 错误: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_info': error_info
            }
    
    def cleanup_old_files(self, older_than_hours: int = 24) -> Dict[str, Any]:
        """清理旧文件"""
        try:
            cleaned_count = error_handler.cleanup_failed_files(older_than_hours)
            return {
                'success': True,
                'cleaned_count': cleaned_count
            }
        except Exception as e:
            error_info = error_handler.handle_system_error(e, "cleanup_old_files")
            self.app_logger.error(f"清理旧文件失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_info': error_info
            }

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='文档处理脚本')
    parser.add_argument('--action', choices=[
        'query', 'process', 'retry', 'status', 'logs', 'cleanup'
    ], required=True, help='执行的操作')
    parser.add_argument('--file-id', help='文件ID（用于process和logs操作）')
    parser.add_argument('--use-semantic', action='store_true', help='使用语义切片')
    parser.add_argument('--max-retry', type=int, default=3, help='最大重试次数')
    parser.add_argument('--older-than-hours', type=int, default=24, help='清理多少小时前的文件')
    parser.add_argument('--query-params', help='查询参数（JSON格式）')
    
    args = parser.parse_args()
    
    # 创建处理器实例
    processor = DocumentProcessor()
    
    try:
        if args.action == 'query':
            # 查询并处理文件
            query_params = None
            if args.query_params:
                import json
                query_params = json.loads(args.query_params)
            
            result = processor.query_and_process_files(query_params, args.use_semantic)
            print(f"查询和处理结果: {result}")
            
        elif args.action == 'process':
            # 处理单个文件
            if not args.file_id:
                print("错误: 处理单个文件需要指定 --file-id")
                sys.exit(1)
            
            result = processor.process_single_file_by_id(args.file_id, args.use_semantic)
            print(f"单文件处理结果: {result}")
            
        elif args.action == 'retry':
            # 重试失败的文件
            result = processor.retry_failed_files(args.max_retry)
            print(f"重试结果: {result}")
            
        elif args.action == 'status':
            # 获取处理状态
            result = processor.get_processing_status()
            print(f"处理状态: {result}")
            
        elif args.action == 'logs':
            # 获取文件日志
            if not args.file_id:
                print("错误: 获取文件日志需要指定 --file-id")
                sys.exit(1)
            
            result = processor.get_file_logs(args.file_id)
            print(f"文件日志: {result}")
            
        elif args.action == 'cleanup':
            # 清理旧文件
            result = processor.cleanup_old_files(args.older_than_hours)
            print(f"清理结果: {result}")
        
    except KeyboardInterrupt:
        print("\n用户中断操作")
        sys.exit(0)
    except Exception as e:
        print(f"执行失败: {str(e)}")
        sys.exit(1)
    finally:
        # 关闭数据库连接
        db_manager.close()

if __name__ == '__main__':
    main()
