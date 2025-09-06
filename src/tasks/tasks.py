"""
Celery任务定义
"""
from .celery_app import celery_app
from ..services.file_operations import file_ops
from ..services.document_converter import doc_converter
from ..services.document_chunker import doc_chunker
from ..services.vectorizer import vectorizer
from ..core.database import db_manager
from ..core.error_handler import error_handler
from ..utils.logger_config import app_logger

@celery_app.task(bind=True, max_retries=3)
def query_files(self, query_params=None):
    """查询文件列表任务"""
    task_id = self.request.id
    try:
        app_logger.info(f"开始执行查询文件任务: {task_id}")
        
        # 执行查询
        files = file_ops.query_files(query_params)
        
        app_logger.info(f"查询文件任务完成: {task_id}, 文件数量: {len(files)}")
        return {
            'success': True,
            'files_count': len(files),
            'files': files
        }
        
    except Exception as e:
        error_info = error_handler.handle_system_error(e, "query_files")
        app_logger.error(f"查询文件任务失败: {task_id}, 错误: {str(e)}")
        
        # 重试逻辑
        if self.request.retries < self.max_retries:
            app_logger.info(f"查询文件任务将重试: {task_id}, 重试次数: {self.request.retries + 1}")
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        
        return {
            'success': False,
            'error': str(e),
            'error_info': error_info
        }

@celery_app.task(bind=True, max_retries=3)
def download_file(self, file_id, file_url=None, file_name=None):
    """下载文件任务"""
    task_id = self.request.id
    try:
        app_logger.info(f"开始执行下载文件任务: {task_id}, 文件ID: {file_id}")
        
        # 执行下载
        download_path = file_ops.download_file(file_id, file_url, file_name)
        
        app_logger.info(f"下载文件任务完成: {task_id}, 文件ID: {file_id}, 路径: {download_path}")
        return {
            'success': True,
            'file_id': file_id,
            'download_path': download_path
        }
        
    except Exception as e:
        error_info = error_handler.handle_task_error(e, file_id, "download_file", self.request.retries)
        app_logger.error(f"下载文件任务失败: {task_id}, 文件ID: {file_id}, 错误: {str(e)}")
        
        # 重试逻辑
        if error_info.get('should_retry', False) and self.request.retries < self.max_retries:
            retry_delay = error_info.get('retry_delay', 60)
            app_logger.info(f"下载文件任务将重试: {task_id}, 文件ID: {file_id}, 延迟: {retry_delay}s")
            raise self.retry(countdown=retry_delay)
        
        return {
            'success': False,
            'file_id': file_id,
            'error': str(e),
            'error_info': error_info
        }

@celery_app.task(bind=True, max_retries=3)
def convert_document(self, file_id, file_path):
    """转换文档任务"""
    task_id = self.request.id
    try:
        app_logger.info(f"开始执行转换文档任务: {task_id}, 文件ID: {file_id}")
        
        # 执行转换
        markdown_path = doc_converter.convert_to_markdown(file_path, file_id)
        
        app_logger.info(f"转换文档任务完成: {task_id}, 文件ID: {file_id}, 输出路径: {markdown_path}")
        return {
            'success': True,
            'file_id': file_id,
            'markdown_path': markdown_path
        }
        
    except Exception as e:
        error_info = error_handler.handle_task_error(e, file_id, "convert_document", self.request.retries)
        app_logger.error(f"转换文档任务失败: {task_id}, 文件ID: {file_id}, 错误: {str(e)}")
        
        # 重试逻辑
        if error_info.get('should_retry', False) and self.request.retries < self.max_retries:
            retry_delay = error_info.get('retry_delay', 60)
            app_logger.info(f"转换文档任务将重试: {task_id}, 文件ID: {file_id}, 延迟: {retry_delay}s")
            raise self.retry(countdown=retry_delay)
        
        return {
            'success': False,
            'file_id': file_id,
            'error': str(e),
            'error_info': error_info
        }

@celery_app.task(bind=True, max_retries=3)
def chunk_document(self, file_id, markdown_path, use_semantic=False):
    """切片文档任务"""
    task_id = self.request.id
    try:
        app_logger.info(f"开始执行切片文档任务: {task_id}, 文件ID: {file_id}")
        
        # 执行切片
        chunks = doc_chunker.chunk_markdown(markdown_path, file_id, use_semantic)
        
        app_logger.info(f"切片文档任务完成: {task_id}, 文件ID: {file_id}, 切片数量: {len(chunks)}")
        return {
            'success': True,
            'file_id': file_id,
            'chunks': chunks,
            'chunk_count': len(chunks)
        }
        
    except Exception as e:
        error_info = error_handler.handle_task_error(e, file_id, "chunk_document", self.request.retries)
        app_logger.error(f"切片文档任务失败: {task_id}, 文件ID: {file_id}, 错误: {str(e)}")
        
        # 重试逻辑
        if error_info.get('should_retry', False) and self.request.retries < self.max_retries:
            retry_delay = error_info.get('retry_delay', 60)
            app_logger.info(f"切片文档任务将重试: {task_id}, 文件ID: {file_id}, 延迟: {retry_delay}s")
            raise self.retry(countdown=retry_delay)
        
        return {
            'success': False,
            'file_id': file_id,
            'error': str(e),
            'error_info': error_info
        }

@celery_app.task(bind=True, max_retries=3)
def vectorize_chunks(self, file_id, chunks):
    """向量化切片任务"""
    task_id = self.request.id
    try:
        app_logger.info(f"开始执行向量化切片任务: {task_id}, 文件ID: {file_id}")
        
        # 执行向量化
        vectorized_chunks = vectorizer.vectorize_chunks(chunks, file_id)
        
        app_logger.info(f"向量化切片任务完成: {task_id}, 文件ID: {file_id}, 向量数量: {len(vectorized_chunks)}")
        return {
            'success': True,
            'file_id': file_id,
            'vectorized_chunks': vectorized_chunks,
            'vector_count': len(vectorized_chunks)
        }
        
    except Exception as e:
        error_info = error_handler.handle_task_error(e, file_id, "vectorize_chunks", self.request.retries)
        app_logger.error(f"向量化切片任务失败: {task_id}, 文件ID: {file_id}, 错误: {str(e)}")
        
        # 重试逻辑
        if error_info.get('should_retry', False) and self.request.retries < self.max_retries:
            retry_delay = error_info.get('retry_delay', 60)
            app_logger.info(f"向量化切片任务将重试: {task_id}, 文件ID: {file_id}, 延迟: {retry_delay}s")
            raise self.retry(countdown=retry_delay)
        
        return {
            'success': False,
            'file_id': file_id,
            'error': str(e),
            'error_info': error_info
        }

@celery_app.task(bind=True, max_retries=3)
def save_data(self, file_id, vectorized_chunks):
    """保存数据任务"""
    task_id = self.request.id
    try:
        app_logger.info(f"开始执行保存数据任务: {task_id}, 文件ID: {file_id}")
        
        # 执行保存
        success = vectorizer.save_data(vectorized_chunks, file_id)
        
        app_logger.info(f"保存数据任务完成: {task_id}, 文件ID: {file_id}, 成功: {success}")
        return {
            'success': success,
            'file_id': file_id
        }
        
    except Exception as e:
        error_info = error_handler.handle_task_error(e, file_id, "save_data", self.request.retries)
        app_logger.error(f"保存数据任务失败: {task_id}, 文件ID: {file_id}, 错误: {str(e)}")
        
        # 重试逻辑
        if error_info.get('should_retry', False) and self.request.retries < self.max_retries:
            retry_delay = error_info.get('retry_delay', 60)
            app_logger.info(f"保存数据任务将重试: {task_id}, 文件ID: {file_id}, 延迟: {retry_delay}s")
            raise self.retry(countdown=retry_delay)
        
        return {
            'success': False,
            'file_id': file_id,
            'error': str(e),
            'error_info': error_info
        }

@celery_app.task(bind=True, max_retries=3)
def process_single_file(self, file_id, use_semantic=False):
    """处理单个文件的完整流程任务"""
    task_id = self.request.id
    try:
        app_logger.info(f"开始执行单文件处理任务: {task_id}, 文件ID: {file_id}")
        
        # 获取文件状态
        file_status = db_manager.get_file_status(file_id)
        if not file_status:
            raise Exception(f"文件状态不存在: {file_id}")
        
        # 步骤1: 下载文件
        if file_status.status == "pending":
            download_result = download_file.delay(file_id, file_status.file_url, file_status.file_name)
            download_result.get(timeout=600)  # 等待下载完成
        
        # 检查下载状态
        file_status = db_manager.get_file_status(file_id)
        if file_status.status != "downloaded":
            raise Exception(f"文件下载失败: {file_id}")
        
        # 步骤2: 转换文档
        if file_status.status == "downloaded":
            convert_result = convert_document.delay(file_id, file_status.download_path)
            convert_result.get(timeout=600)  # 等待转换完成
        
        # 检查转换状态
        file_status = db_manager.get_file_status(file_id)
        if file_status.status != "converted":
            raise Exception(f"文档转换失败: {file_id}")
        
        # 步骤3: 切片文档
        if file_status.status == "converted":
            chunk_result = chunk_document.delay(file_id, file_status.markdown_path, use_semantic)
            chunk_result = chunk_result.get(timeout=600)  # 等待切片完成
        
        # 检查切片状态
        file_status = db_manager.get_file_status(file_id)
        if file_status.status != "chunked":
            raise Exception(f"文档切片失败: {file_id}")
        
        # 步骤4: 向量化切片
        chunks = doc_chunker.get_chunks_from_file(file_id)
        if not chunks:
            raise Exception(f"无法获取切片数据: {file_id}")
        
        if file_status.status == "chunked":
            vectorize_result = vectorize_chunks.delay(file_id, chunks)
            vectorize_result.get(timeout=600)  # 等待向量化完成
        
        # 检查向量化状态
        file_status = db_manager.get_file_status(file_id)
        if file_status.status != "vectorized":
            raise Exception(f"切片向量化失败: {file_id}")
        
        # 步骤5: 保存数据
        vectorized_chunks = vectorizer.get_vectorization_info(file_id)
        if file_status.status == "vectorized":
            save_result = save_data.delay(file_id, vectorized_chunks)
            save_result.get(timeout=600)  # 等待保存完成
        
        # 检查最终状态
        file_status = db_manager.get_file_status(file_id)
        if file_status.status != "completed":
            raise Exception(f"数据保存失败: {file_id}")
        
        app_logger.info(f"单文件处理任务完成: {task_id}, 文件ID: {file_id}")
        return {
            'success': True,
            'file_id': file_id,
            'status': file_status.status
        }
        
    except Exception as e:
        error_info = error_handler.handle_task_error(e, file_id, "process_single_file", self.request.retries)
        app_logger.error(f"单文件处理任务失败: {task_id}, 文件ID: {file_id}, 错误: {str(e)}")
        
        # 重试逻辑
        if error_info.get('should_retry', False) and self.request.retries < self.max_retries:
            retry_delay = error_info.get('retry_delay', 60)
            app_logger.info(f"单文件处理任务将重试: {task_id}, 文件ID: {file_id}, 延迟: {retry_delay}s")
            raise self.retry(countdown=retry_delay)
        
        return {
            'success': False,
            'file_id': file_id,
            'error': str(e),
            'error_info': error_info
        }

@celery_app.task(bind=True)
def retry_failed_files(self, max_retry_count=3):
    """重试失败的文件任务"""
    task_id = self.request.id
    try:
        app_logger.info(f"开始执行重试失败文件任务: {task_id}")
        
        # 获取失败的文件
        failed_files = db_manager.get_failed_files()
        retry_count = 0
        
        for file_status in failed_files:
            if file_status.retry_count < max_retry_count:
                # 重置状态为pending
                db_manager.update_status(file_status.file_id, "pending")
                
                # 重新提交处理任务
                process_single_file.delay(file_status.file_id)
                retry_count += 1
        
        app_logger.info(f"重试失败文件任务完成: {task_id}, 重试文件数量: {retry_count}")
        return {
            'success': True,
            'retry_count': retry_count
        }
        
    except Exception as e:
        error_info = error_handler.handle_system_error(e, "retry_failed_files")
        app_logger.error(f"重试失败文件任务失败: {task_id}, 错误: {str(e)}")
        
        return {
            'success': False,
            'error': str(e),
            'error_info': error_info
        }
