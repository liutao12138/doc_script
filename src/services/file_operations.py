"""
文件操作模块 - 查询和下载文件
"""
import requests
import os
import time
from typing import List, Dict, Any, Optional
from pathlib import Path
from loguru import logger
from ..core.config import URL1, URL2, DOWNLOAD_DIR, OUTPUT_DIR
from ..core.database import db_manager

class FileOperations:
    """文件操作类"""
    
    def __init__(self):
        self.download_dir = Path(DOWNLOAD_DIR)
        self.output_dir = Path(OUTPUT_DIR)
        self.download_dir.mkdir(exist_ok=True)
        self.output_dir.mkdir(exist_ok=True)
        
        # 创建子目录
        (self.download_dir / "temp").mkdir(exist_ok=True)
        (self.output_dir / "markdown").mkdir(exist_ok=True)
        (self.output_dir / "chunks").mkdir(exist_ok=True)
    
    def query_files(self, query_params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        查询文件列表
        
        Args:
            query_params: 查询参数
            
        Returns:
            文件列表，包含元数据信息
        """
        try:
            logger.info(f"开始查询文件列表，URL: {URL1}")
            db_manager.add_log("system", "INFO", f"开始查询文件列表，URL: {URL1}")
            
            # 发送请求
            response = requests.get(URL1, params=query_params, timeout=30)
            response.raise_for_status()
            
            # 解析响应
            data = response.json()
            files = data.get('files', []) if isinstance(data, dict) else data
            
            logger.info(f"查询到 {len(files)} 个文件")
            db_manager.add_log("system", "INFO", f"查询到 {len(files)} 个文件")
            
            # 将文件添加到数据库
            for file_info in files:
                file_id = file_info.get('id') or file_info.get('file_id')
                file_name = file_info.get('name') or file_info.get('file_name')
                file_url = file_info.get('url') or file_info.get('download_url')
                file_size = file_info.get('size') or file_info.get('file_size')
                file_type = file_info.get('type') or file_info.get('file_type')
                
                if file_id and file_name:
                    # 检查文件是否已存在
                    existing_file = db_manager.get_file_status(file_id)
                    if not existing_file:
                        db_manager.add_file(
                            file_id=file_id,
                            file_name=file_name,
                            file_url=file_url,
                            file_size=file_size,
                            file_type=file_type,
                            metadata=file_info
                        )
                        logger.info(f"添加文件到处理队列: {file_name} (ID: {file_id})")
                    else:
                        logger.info(f"文件已存在，跳过: {file_name} (ID: {file_id})")
            
            return files
            
        except requests.exceptions.RequestException as e:
            error_msg = f"查询文件列表失败: {str(e)}"
            logger.error(error_msg)
            db_manager.add_log("system", "ERROR", error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"查询文件列表时发生未知错误: {str(e)}"
            logger.error(error_msg)
            db_manager.add_log("system", "ERROR", error_msg)
            raise Exception(error_msg)
    
    def download_file(self, file_id: str, file_url: str = None, 
                     file_name: str = None) -> str:
        """
        下载文件
        
        Args:
            file_id: 文件ID
            file_url: 文件下载URL
            file_name: 文件名
            
        Returns:
            下载文件的本地路径
        """
        start_time = time.time()
        
        try:
            # 更新状态为下载中
            db_manager.update_status(file_id, "downloading")
            logger.info(f"开始下载文件: {file_id}")
            db_manager.add_log(file_id, "INFO", f"开始下载文件: {file_id}")
            
            # 获取文件信息
            file_status = db_manager.get_file_status(file_id)
            if not file_status:
                raise Exception(f"文件状态不存在: {file_id}")
            
            # 使用提供的URL或从数据库获取
            download_url = file_url or file_status.file_url
            if not download_url:
                raise Exception(f"文件下载URL不存在: {file_id}")
            
            # 构建下载URL
            download_url = f"{URL2}?file_id={file_id}"
            if file_url:
                download_url = file_url
            
            # 发送下载请求
            response = requests.get(download_url, stream=True, timeout=300)
            response.raise_for_status()
            
            # 确定文件名
            if not file_name:
                file_name = file_status.file_name
                if not file_name:
                    # 从Content-Disposition头获取文件名
                    content_disposition = response.headers.get('Content-Disposition', '')
                    if 'filename=' in content_disposition:
                        file_name = content_disposition.split('filename=')[1].strip('"')
                    else:
                        file_name = f"file_{file_id}"
            
            # 确定文件扩展名
            file_extension = self._get_file_extension(file_name, response.headers.get('Content-Type', ''))
            if not file_name.endswith(file_extension):
                file_name += file_extension
            
            # 构建保存路径
            download_path = self.download_dir / "temp" / f"{file_id}_{file_name}"
            
            # 下载文件
            total_size = 0
            with open(download_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        total_size += len(chunk)
            
            download_time = time.time() - start_time
            
            # 更新状态
            db_manager.update_status(
                file_id, 
                "downloaded",
                download_path=str(download_path),
                download_time=download_time
            )
            
            logger.info(f"文件下载完成: {file_name}, 大小: {total_size} bytes, 耗时: {download_time:.2f}s")
            db_manager.add_log(
                file_id, 
                "INFO", 
                f"文件下载完成: {file_name}, 大小: {total_size} bytes, 耗时: {download_time:.2f}s"
            )
            
            return str(download_path)
            
        except requests.exceptions.RequestException as e:
            error_msg = f"下载文件失败: {str(e)}"
            logger.error(error_msg)
            db_manager.update_status(file_id, "failed", error_msg)
            db_manager.add_log(file_id, "ERROR", error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"下载文件时发生未知错误: {str(e)}"
            logger.error(error_msg)
            db_manager.update_status(file_id, "failed", error_msg)
            db_manager.add_log(file_id, "ERROR", error_msg)
            raise Exception(error_msg)
    
    def _get_file_extension(self, file_name: str, content_type: str) -> str:
        """根据文件名和内容类型确定文件扩展名"""
        # 如果文件名已有扩展名，直接返回
        if '.' in file_name:
            return ''
        
        # 根据内容类型确定扩展名
        content_type_map = {
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/vnd.ms-powerpoint': '.ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
            'text/plain': '.txt',
            'text/html': '.html',
            'text/csv': '.csv',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
        }
        
        return content_type_map.get(content_type.lower(), '')
    
    def get_file_info(self, file_id: str) -> Optional[Dict[str, Any]]:
        """获取文件信息"""
        file_status = db_manager.get_file_status(file_id)
        if file_status:
            return {
                'file_id': file_status.file_id,
                'file_name': file_status.file_name,
                'file_url': file_status.file_url,
                'file_size': file_status.file_size,
                'file_type': file_status.file_type,
                'status': file_status.status,
                'download_path': file_status.download_path,
                'metadata': file_status.metadata_json,
                'created_at': file_status.created_at,
                'updated_at': file_status.updated_at,
                'error_message': file_status.error_message,
                'retry_count': file_status.retry_count
            }
        return None
    
    def cleanup_temp_files(self, file_id: str = None):
        """清理临时文件"""
        try:
            if file_id:
                # 清理特定文件的临时文件
                file_status = db_manager.get_file_status(file_id)
                if file_status and file_status.download_path:
                    temp_file = Path(file_status.download_path)
                    if temp_file.exists():
                        temp_file.unlink()
                        logger.info(f"清理临时文件: {temp_file}")
            else:
                # 清理所有临时文件
                temp_dir = self.download_dir / "temp"
                for temp_file in temp_dir.iterdir():
                    if temp_file.is_file():
                        temp_file.unlink()
                        logger.info(f"清理临时文件: {temp_file}")
        except Exception as e:
            logger.error(f"清理临时文件失败: {str(e)}")

# 全局文件操作实例
file_ops = FileOperations()
