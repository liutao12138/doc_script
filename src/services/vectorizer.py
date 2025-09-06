"""
向量化和数据保存模块
"""
import time
import json
import requests
from typing import List, Dict, Any, Optional
from loguru import logger
from ..core.config import URL3, URL4, OPENAI_API_KEY
from ..core.database import db_manager

class Vectorizer:
    """向量化器类"""
    
    def __init__(self):
        self.vectorize_url = URL3
        self.save_url = URL4
        self.api_key = OPENAI_API_KEY
    
    def vectorize_chunks(self, chunks: List[Dict[str, Any]], file_id: str) -> List[Dict[str, Any]]:
        """
        对切片进行向量化
        
        Args:
            chunks: 切片列表
            file_id: 文件ID
            
        Returns:
            包含向量的切片列表
        """
        start_time = time.time()
        
        try:
            # 更新状态为向量化中
            db_manager.update_status(file_id, "vectorizing")
            logger.info(f"开始向量化切片: {file_id}, 切片数量: {len(chunks)}")
            db_manager.add_log(file_id, "INFO", f"开始向量化切片: {file_id}, 切片数量: {len(chunks)}")
            
            vectorized_chunks = []
            
            # 批量处理切片
            batch_size = 10  # 每批处理10个切片
            for i in range(0, len(chunks), batch_size):
                batch = chunks[i:i + batch_size]
                batch_results = self._vectorize_batch(batch, file_id)
                vectorized_chunks.extend(batch_results)
                
                # 记录进度
                progress = min(i + batch_size, len(chunks))
                logger.info(f"向量化进度: {progress}/{len(chunks)}")
                db_manager.add_log(file_id, "INFO", f"向量化进度: {progress}/{len(chunks)}")
            
            vectorize_time = time.time() - start_time
            
            # 更新状态
            db_manager.update_status(
                file_id,
                "vectorized",
                vector_count=len(vectorized_chunks),
                vectorize_time=vectorize_time
            )
            
            logger.info(f"向量化完成: {file_id}, 向量数量: {len(vectorized_chunks)}, 耗时: {vectorize_time:.2f}s")
            db_manager.add_log(
                file_id,
                "INFO",
                f"向量化完成: {file_id}, 向量数量: {len(vectorized_chunks)}, 耗时: {vectorize_time:.2f}s"
            )
            
            return vectorized_chunks
            
        except Exception as e:
            error_msg = f"向量化失败: {str(e)}"
            logger.error(error_msg)
            db_manager.update_status(file_id, "failed", error_msg)
            db_manager.add_log(file_id, "ERROR", error_msg)
            raise Exception(error_msg)
    
    def _vectorize_batch(self, batch: List[Dict[str, Any]], file_id: str) -> List[Dict[str, Any]]:
        """批量向量化切片"""
        try:
            # 准备请求数据
            request_data = {
                'chunks': batch,
                'file_id': file_id,
                'api_key': self.api_key
            }
            
            # 发送向量化请求
            response = requests.post(
                self.vectorize_url,
                json=request_data,
                timeout=300,
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            
            # 解析响应
            result = response.json()
            
            if result.get('success'):
                vectorized_chunks = result.get('vectorized_chunks', [])
                logger.info(f"批量向量化成功: {len(vectorized_chunks)} 个切片")
                return vectorized_chunks
            else:
                error_msg = result.get('error', '向量化请求失败')
                raise Exception(error_msg)
                
        except requests.exceptions.RequestException as e:
            error_msg = f"向量化请求失败: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"批量向量化失败: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def save_data(self, vectorized_chunks: List[Dict[str, Any]], file_id: str) -> bool:
        """
        保存向量化数据
        
        Args:
            vectorized_chunks: 包含向量的切片列表
            file_id: 文件ID
            
        Returns:
            保存是否成功
        """
        start_time = time.time()
        
        try:
            # 更新状态为保存中
            db_manager.update_status(file_id, "saving")
            logger.info(f"开始保存数据: {file_id}, 数据量: {len(vectorized_chunks)}")
            db_manager.add_log(file_id, "INFO", f"开始保存数据: {file_id}, 数据量: {len(vectorized_chunks)}")
            
            # 准备保存数据
            save_data = {
                'file_id': file_id,
                'vectorized_chunks': vectorized_chunks,
                'metadata': self._prepare_save_metadata(file_id, vectorized_chunks)
            }
            
            # 发送保存请求
            response = requests.post(
                self.save_url,
                json=save_data,
                timeout=300,
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            
            # 解析响应
            result = response.json()
            
            if result.get('success'):
                save_time = time.time() - start_time
                
                # 更新状态为完成
                db_manager.update_status(
                    file_id,
                    "completed",
                    save_time=save_time,
                    total_time=self._calculate_total_time(file_id)
                )
                
                logger.info(f"数据保存完成: {file_id}, 耗时: {save_time:.2f}s")
                db_manager.add_log(
                    file_id,
                    "INFO",
                    f"数据保存完成: {file_id}, 耗时: {save_time:.2f}s"
                )
                
                return True
            else:
                error_msg = result.get('error', '数据保存失败')
                raise Exception(error_msg)
                
        except requests.exceptions.RequestException as e:
            error_msg = f"数据保存请求失败: {str(e)}"
            logger.error(error_msg)
            db_manager.update_status(file_id, "failed", error_msg)
            db_manager.add_log(file_id, "ERROR", error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"数据保存失败: {str(e)}"
            logger.error(error_msg)
            db_manager.update_status(file_id, "failed", error_msg)
            db_manager.add_log(file_id, "ERROR", error_msg)
            raise Exception(error_msg)
    
    def _prepare_save_metadata(self, file_id: str, vectorized_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """准备保存元数据"""
        try:
            file_status = db_manager.get_file_status(file_id)
            
            metadata = {
                'file_id': file_id,
                'processing_info': {
                    'total_chunks': len(vectorized_chunks),
                    'download_time': file_status.download_time if file_status else None,
                    'convert_time': file_status.convert_time if file_status else None,
                    'chunk_time': file_status.chunk_time if file_status else None,
                    'vectorize_time': file_status.vectorize_time if file_status else None,
                    'save_time': file_status.save_time if file_status else None,
                    'total_time': file_status.total_time if file_status else None
                },
                'file_info': {
                    'file_name': file_status.file_name if file_status else None,
                    'file_type': file_status.file_type if file_status else None,
                    'file_size': file_status.file_size if file_status else None,
                    'original_metadata': file_status.metadata_json if file_status else None
                },
                'vector_info': {
                    'vector_dimension': self._get_vector_dimension(vectorized_chunks),
                    'embedding_model': 'openai' if self.api_key else 'unknown'
                }
            }
            
            return metadata
            
        except Exception as e:
            logger.error(f"准备保存元数据失败: {str(e)}")
            return {'file_id': file_id, 'error': str(e)}
    
    def _get_vector_dimension(self, vectorized_chunks: List[Dict[str, Any]]) -> Optional[int]:
        """获取向量维度"""
        try:
            if vectorized_chunks and 'vector' in vectorized_chunks[0]:
                vector = vectorized_chunks[0]['vector']
                if isinstance(vector, list):
                    return len(vector)
            return None
        except Exception:
            return None
    
    def _calculate_total_time(self, file_id: str) -> Optional[float]:
        """计算总处理时间"""
        try:
            file_status = db_manager.get_file_status(file_id)
            if file_status:
                times = [
                    file_status.download_time,
                    file_status.convert_time,
                    file_status.chunk_time,
                    file_status.vectorize_time,
                    file_status.save_time
                ]
                total_time = sum(t for t in times if t is not None)
                return total_time
            return None
        except Exception:
            return None
    
    def process_chunks_to_vectors(self, chunks: List[Dict[str, Any]], file_id: str) -> bool:
        """
        完整的切片到向量处理流程
        
        Args:
            chunks: 切片列表
            file_id: 文件ID
            
        Returns:
            处理是否成功
        """
        try:
            # 向量化切片
            vectorized_chunks = self.vectorize_chunks(chunks, file_id)
            
            # 保存数据
            success = self.save_data(vectorized_chunks, file_id)
            
            if success:
                logger.info(f"切片到向量处理完成: {file_id}")
                return True
            else:
                logger.error(f"切片到向量处理失败: {file_id}")
                return False
                
        except Exception as e:
            error_msg = f"切片到向量处理失败: {str(e)}"
            logger.error(error_msg)
            db_manager.update_status(file_id, "failed", error_msg)
            db_manager.add_log(file_id, "ERROR", error_msg)
            return False
    
    def get_vectorization_info(self, file_id: str) -> Optional[Dict[str, Any]]:
        """获取向量化信息"""
        file_status = db_manager.get_file_status(file_id)
        if file_status and file_status.vector_count > 0:
            return {
                'file_id': file_id,
                'vector_count': file_status.vector_count,
                'vectorize_time': file_status.vectorize_time,
                'save_time': file_status.save_time,
                'total_time': file_status.total_time,
                'status': file_status.status
            }
        return None

# 全局向量化器实例
vectorizer = Vectorizer()
