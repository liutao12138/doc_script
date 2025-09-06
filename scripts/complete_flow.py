"""
完整的文件处理流程脚本
从文件下载到数据保存的完整流程
"""
import argparse
import sys
import time
import os
import json
from typing import Dict, Any, List
from loguru import logger
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.core.database import db_manager
from src.services.file_operations import file_ops
from src.services.document_converter import doc_converter
from src.services.document_chunker import doc_chunker
from src.services.vectorizer import vectorizer
from src.tasks.tasks import (
    query_files, download_file, convert_document, 
    chunk_document, vectorize_chunks, save_data,
    process_single_file
)
from src.core.error_handler import error_handler
from src.utils.logger_config import app_logger

class CompleteDocumentFlow:
    """完整的文档处理流程类"""
    
    def __init__(self):
        self.app_logger = app_logger
        self.processed_files = []
        self.failed_files = []
    
    def run_complete_flow(self, query_params: Dict[str, Any] = None, 
                         use_semantic: bool = False,
                         max_files: int = None) -> Dict[str, Any]:
        """
        运行完整的文档处理流程
        
        Args:
            query_params: 查询参数
            use_semantic: 是否使用语义切片
            max_files: 最大处理文件数量
            
        Returns:
            处理结果统计
        """
        start_time = time.time()
        self.app_logger.info("=" * 60)
        self.app_logger.info("开始执行完整的文档处理流程")
        self.app_logger.info("=" * 60)
        
        try:
            # 步骤1: 查询文件列表
            self.app_logger.info("步骤1: 查询文件列表")
            files = self._query_files(query_params)
            if not files:
                return {
                    'success': False,
                    'error': '没有查询到任何文件',
                    'processed_files': 0,
                    'failed_files': 0,
                    'total_time': 0
                }
            
            # 限制处理文件数量
            if max_files and len(files) > max_files:
                files = files[:max_files]
                self.app_logger.info(f"限制处理文件数量为: {max_files}")
            
            # 步骤2: 处理每个文件
            self.app_logger.info(f"步骤2: 开始处理 {len(files)} 个文件")
            for i, file_info in enumerate(files, 1):
                file_id = file_info.get('id') or file_info.get('file_id')
                file_name = file_info.get('name') or file_info.get('file_name')
                
                self.app_logger.info(f"处理文件 {i}/{len(files)}: {file_name} (ID: {file_id})")
                
                try:
                    result = self._process_single_file_complete(file_id, use_semantic)
                    if result['success']:
                        self.processed_files.append({
                            'file_id': file_id,
                            'file_name': file_name,
                            'result': result
                        })
                        self.app_logger.info(f"✅ 文件处理成功: {file_name}")
                    else:
                        self.failed_files.append({
                            'file_id': file_id,
                            'file_name': file_name,
                            'error': result.get('error', '未知错误')
                        })
                        self.app_logger.error(f"❌ 文件处理失败: {file_name} - {result.get('error')}")
                        
                except Exception as e:
                    self.failed_files.append({
                        'file_id': file_id,
                        'file_name': file_name,
                        'error': str(e)
                    })
                    self.app_logger.error(f"❌ 文件处理异常: {file_name} - {str(e)}")
            
            # 计算总耗时
            total_time = time.time() - start_time
            
            # 生成处理报告
            report = self._generate_report(total_time)
            
            self.app_logger.info("=" * 60)
            self.app_logger.info("完整流程执行完成")
            self.app_logger.info("=" * 60)
            
            return report
            
        except Exception as e:
            error_info = error_handler.handle_system_error(e, "run_complete_flow")
            self.app_logger.error(f"完整流程执行失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_info': error_info,
                'processed_files': len(self.processed_files),
                'failed_files': len(self.failed_files),
                'total_time': time.time() - start_time
            }
    
    def _query_files(self, query_params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """查询文件列表"""
        try:
            self.app_logger.info("正在查询文件列表...")
            files = file_ops.query_files(query_params)
            self.app_logger.info(f"查询到 {len(files)} 个文件")
            return files
        except Exception as e:
            self.app_logger.error(f"查询文件列表失败: {str(e)}")
            raise
    
    def _process_single_file_complete(self, file_id: str, use_semantic: bool = False) -> Dict[str, Any]:
        """
        处理单个文件的完整流程（同步版本）
        
        Args:
            file_id: 文件ID
            use_semantic: 是否使用语义切片
            
        Returns:
            处理结果
        """
        try:
            self.app_logger.info(f"开始处理文件: {file_id}")
            
            # 获取文件状态
            file_status = db_manager.get_file_status(file_id)
            if not file_status:
                raise Exception(f"文件状态不存在: {file_id}")
            
            # 步骤1: 下载文件
            self.app_logger.info(f"  📥 下载文件: {file_id}")
            download_path = self._download_file_sync(file_id)
            
            # 步骤2: 转换文档
            self.app_logger.info(f"  🔄 转换文档: {file_id}")
            markdown_path = self._convert_document_sync(file_id, download_path)
            
            # 步骤3: 切片文档
            self.app_logger.info(f"  ✂️  切片文档: {file_id}")
            chunks = self._chunk_document_sync(file_id, markdown_path, use_semantic)
            
            # 步骤4: 向量化切片
            self.app_logger.info(f"  🧠 向量化切片: {file_id}")
            vectorized_chunks = self._vectorize_chunks_sync(file_id, chunks)
            
            # 步骤5: 保存数据
            self.app_logger.info(f"  💾 保存数据: {file_id}")
            save_success = self._save_data_sync(file_id, vectorized_chunks)
            
            if save_success:
                self.app_logger.info(f"  ✅ 文件处理完成: {file_id}")
                return {
                    'success': True,
                    'file_id': file_id,
                    'download_path': download_path,
                    'markdown_path': markdown_path,
                    'chunk_count': len(chunks),
                    'vector_count': len(vectorized_chunks)
                }
            else:
                raise Exception("数据保存失败")
                
        except Exception as e:
            self.app_logger.error(f"文件处理失败: {file_id} - {str(e)}")
            return {
                'success': False,
                'file_id': file_id,
                'error': str(e)
            }
    
    def _download_file_sync(self, file_id: str) -> str:
        """同步下载文件"""
        try:
            file_status = db_manager.get_file_status(file_id)
            if not file_status:
                raise Exception(f"文件状态不存在: {file_id}")
            
            # 更新状态为下载中
            db_manager.update_status(file_id, "downloading")
            
            # 执行下载
            download_path = file_ops.download_file(
                file_id, 
                file_status.file_url, 
                file_status.file_name
            )
            
            # 更新状态为已下载
            db_manager.update_status(file_id, "downloaded", download_path=download_path)
            
            return download_path
            
        except Exception as e:
            db_manager.update_status(file_id, "failed", error_message=str(e))
            raise
    
    def _convert_document_sync(self, file_id: str, file_path: str) -> str:
        """同步转换文档"""
        try:
            # 更新状态为转换中
            db_manager.update_status(file_id, "converting")
            
            # 执行转换
            markdown_path = doc_converter.convert_to_markdown(file_path, file_id)
            
            # 更新状态为已转换
            db_manager.update_status(file_id, "converted", markdown_path=markdown_path)
            
            return markdown_path
            
        except Exception as e:
            db_manager.update_status(file_id, "failed", error_message=str(e))
            raise
    
    def _chunk_document_sync(self, file_id: str, markdown_path: str, use_semantic: bool = False) -> List[Dict[str, Any]]:
        """同步切片文档"""
        try:
            # 更新状态为切片中
            db_manager.update_status(file_id, "chunking")
            
            # 执行切片
            chunks = doc_chunker.chunk_markdown(markdown_path, file_id, use_semantic)
            
            # 更新状态为已切片
            db_manager.update_status(file_id, "chunked", chunk_count=len(chunks))
            
            return chunks
            
        except Exception as e:
            db_manager.update_status(file_id, "failed", error_message=str(e))
            raise
    
    def _vectorize_chunks_sync(self, file_id: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """同步向量化切片"""
        try:
            # 更新状态为向量化中
            db_manager.update_status(file_id, "vectorizing")
            
            # 执行向量化
            vectorized_chunks = vectorizer.vectorize_chunks(chunks, file_id)
            
            # 更新状态为已向量化
            db_manager.update_status(file_id, "vectorized", vector_count=len(vectorized_chunks))
            
            return vectorized_chunks
            
        except Exception as e:
            db_manager.update_status(file_id, "failed", error_message=str(e))
            raise
    
    def _save_data_sync(self, file_id: str, vectorized_chunks: List[Dict[str, Any]]) -> bool:
        """同步保存数据"""
        try:
            # 更新状态为保存中
            db_manager.update_status(file_id, "saving")
            
            # 执行保存
            success = vectorizer.save_data(vectorized_chunks, file_id)
            
            if success:
                # 更新状态为已完成
                db_manager.update_status(file_id, "completed")
                return True
            else:
                raise Exception("数据保存失败")
                
        except Exception as e:
            db_manager.update_status(file_id, "failed", error_message=str(e))
            raise
    
    def _generate_report(self, total_time: float) -> Dict[str, Any]:
        """生成处理报告"""
        report = {
            'success': True,
            'total_time': total_time,
            'processed_files': len(self.processed_files),
            'failed_files': len(self.failed_files),
            'success_rate': len(self.processed_files) / (len(self.processed_files) + len(self.failed_files)) * 100 if (len(self.processed_files) + len(self.failed_files)) > 0 else 0,
            'processed_file_details': self.processed_files,
            'failed_file_details': self.failed_files,
            'statistics': {
                'total_chunks': sum(f.get('result', {}).get('chunk_count', 0) for f in self.processed_files),
                'total_vectors': sum(f.get('result', {}).get('vector_count', 0) for f in self.processed_files),
                'average_processing_time': total_time / len(self.processed_files) if self.processed_files else 0
            }
        }
        
        # 打印报告
        self.app_logger.info("📊 处理报告:")
        self.app_logger.info(f"  总耗时: {total_time:.2f} 秒")
        self.app_logger.info(f"  成功处理: {len(self.processed_files)} 个文件")
        self.app_logger.info(f"  处理失败: {len(self.failed_files)} 个文件")
        self.app_logger.info(f"  成功率: {report['success_rate']:.1f}%")
        self.app_logger.info(f"  总切片数: {report['statistics']['total_chunks']}")
        self.app_logger.info(f"  总向量数: {report['statistics']['total_vectors']}")
        
        if self.failed_files:
            self.app_logger.info("❌ 失败文件列表:")
            for failed_file in self.failed_files:
                self.app_logger.info(f"  - {failed_file['file_name']}: {failed_file['error']}")
        
        return report
    
    def get_processing_status(self) -> Dict[str, Any]:
        """获取当前处理状态"""
        try:
            stats = db_manager.get_statistics()
            return {
                'success': True,
                'statistics': stats
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='完整的文档处理流程')
    parser.add_argument('--query-params', help='查询参数（JSON格式）')
    parser.add_argument('--use-semantic', action='store_true', help='使用语义切片')
    parser.add_argument('--max-files', type=int, help='最大处理文件数量')
    parser.add_argument('--status', action='store_true', help='只显示处理状态')
    
    args = parser.parse_args()
    
    # 创建流程处理器实例
    processor = CompleteDocumentFlow()
    
    try:
        if args.status:
            # 只显示状态
            result = processor.get_processing_status()
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            # 运行完整流程
            query_params = None
            if args.query_params:
                query_params = json.loads(args.query_params)
            
            result = processor.run_complete_flow(
                query_params=query_params,
                use_semantic=args.use_semantic,
                max_files=args.max_files
            )
            
            print(json.dumps(result, indent=2, ensure_ascii=False))
        
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
