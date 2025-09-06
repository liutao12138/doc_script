"""
文档切片模块 - 使用LlamaIndex对Markdown文档进行切片
"""
import time
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from loguru import logger
from llama_index.core import Document, SimpleDirectoryReader
from llama_index.core.node_parser import SentenceSplitter, SemanticSplitterNodeParser
from llama_index.core.schema import TextNode
from llama_index.embeddings.openai import OpenAIEmbedding
from ..core.config import OUTPUT_DIR, CHUNK_SIZE, CHUNK_OVERLAP, OPENAI_API_KEY
from ..core.database import db_manager

class DocumentChunker:
    """文档切片器类"""
    
    def __init__(self):
        self.output_dir = Path(OUTPUT_DIR) / "chunks"
        self.output_dir.mkdir(exist_ok=True)
        
        # 配置切片器
        self.chunk_size = CHUNK_SIZE
        self.chunk_overlap = CHUNK_OVERLAP
        
        # 初始化嵌入模型（用于语义切片）
        self.embed_model = None
        if OPENAI_API_KEY:
            try:
                self.embed_model = OpenAIEmbedding(api_key=OPENAI_API_KEY)
                logger.info("OpenAI嵌入模型初始化成功")
            except Exception as e:
                logger.warning(f"OpenAI嵌入模型初始化失败: {str(e)}")
        
        # 初始化切片器
        self.text_splitter = SentenceSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separator="\n\n"
        )
        
        # 语义切片器（如果可用）
        self.semantic_splitter = None
        if self.embed_model:
            try:
                self.semantic_splitter = SemanticSplitterNodeParser(
                    buffer_size=1,
                    breakpoint_percentile_threshold=95,
                    embed_model=self.embed_model
                )
                logger.info("语义切片器初始化成功")
            except Exception as e:
                logger.warning(f"语义切片器初始化失败: {str(e)}")
    
    def chunk_markdown(self, markdown_path: str, file_id: str, 
                      use_semantic: bool = False) -> List[Dict[str, Any]]:
        """
        对Markdown文档进行切片
        
        Args:
            markdown_path: Markdown文件路径
            file_id: 文件ID
            use_semantic: 是否使用语义切片
            
        Returns:
            切片列表
        """
        start_time = time.time()
        
        try:
            # 更新状态为切片中
            db_manager.update_status(file_id, "chunking")
            logger.info(f"开始切片文档: {file_id}, 文件路径: {markdown_path}")
            db_manager.add_log(file_id, "INFO", f"开始切片文档: {file_id}, 文件路径: {markdown_path}")
            
            # 检查Markdown文件是否存在
            md_file = Path(markdown_path)
            if not md_file.exists():
                raise Exception(f"Markdown文件不存在: {markdown_path}")
            
            # 读取Markdown内容
            with open(md_file, 'r', encoding='utf-8') as f:
                markdown_content = f.read()
            
            # 创建LlamaIndex文档对象
            document = Document(
                text=markdown_content,
                metadata={
                    'file_id': file_id,
                    'file_name': md_file.name,
                    'file_path': str(md_file)
                }
            )
            
            # 选择切片器
            if use_semantic and self.semantic_splitter:
                logger.info(f"使用语义切片器: {file_id}")
                nodes = self.semantic_splitter.get_nodes_from_documents([document])
            else:
                logger.info(f"使用文本切片器: {file_id}")
                nodes = self.text_splitter.get_nodes_from_documents([document])
            
            # 处理切片结果
            chunks = []
            for i, node in enumerate(nodes):
                chunk_data = {
                    'chunk_id': f"{file_id}_chunk_{i}",
                    'file_id': file_id,
                    'content': node.text,
                    'metadata': {
                        **node.metadata,
                        'chunk_index': i,
                        'chunk_size': len(node.text),
                        'start_char_idx': getattr(node, 'start_char_idx', None),
                        'end_char_idx': getattr(node, 'end_char_idx', None)
                    }
                }
                chunks.append(chunk_data)
            
            chunk_time = time.time() - start_time
            
            # 保存切片到文件
            chunks_file = self.output_dir / f"{file_id}_chunks.json"
            with open(chunks_file, 'w', encoding='utf-8') as f:
                json.dump(chunks, f, ensure_ascii=False, indent=2)
            
            # 更新状态
            db_manager.update_status(
                file_id,
                "chunked",
                chunk_count=len(chunks),
                chunk_time=chunk_time
            )
            
            logger.info(f"文档切片完成: {file_id}, 切片数量: {len(chunks)}, 耗时: {chunk_time:.2f}s")
            db_manager.add_log(
                file_id,
                "INFO",
                f"文档切片完成: {file_id}, 切片数量: {len(chunks)}, 耗时: {chunk_time:.2f}s"
            )
            
            return chunks
            
        except Exception as e:
            error_msg = f"文档切片失败: {str(e)}"
            logger.error(error_msg)
            db_manager.update_status(file_id, "failed", error_msg)
            db_manager.add_log(file_id, "ERROR", error_msg)
            raise Exception(error_msg)
    
    def chunk_with_metadata(self, markdown_path: str, file_id: str, 
                           file_metadata: Dict[str, Any] = None,
                           use_semantic: bool = False) -> List[Dict[str, Any]]:
        """
        切片文档并包含元数据信息
        
        Args:
            markdown_path: Markdown文件路径
            file_id: 文件ID
            file_metadata: 文件元数据
            use_semantic: 是否使用语义切片
            
        Returns:
            包含元数据的切片列表
        """
        try:
            # 执行切片
            chunks = self.chunk_markdown(markdown_path, file_id, use_semantic)
            
            # 获取文件状态信息
            file_status = db_manager.get_file_status(file_id)
            
            # 为每个切片添加元数据
            enriched_chunks = []
            for chunk in chunks:
                enriched_chunk = {
                    **chunk,
                    'metadata': {
                        **chunk['metadata'],
                        'file_metadata': file_metadata or {},
                        'processing_metadata': {
                            'file_name': file_status.file_name if file_status else None,
                            'file_type': file_status.file_type if file_status else None,
                            'file_size': file_status.file_size if file_status else None,
                            'original_metadata': file_status.metadata_json if file_status else None,
                            'chunk_method': 'semantic' if use_semantic else 'text_splitter',
                            'chunk_size_setting': self.chunk_size,
                            'chunk_overlap_setting': self.chunk_overlap
                        }
                    }
                }
                enriched_chunks.append(enriched_chunk)
            
            logger.info(f"文档切片完成，包含元数据: {file_id}, 切片数量: {len(enriched_chunks)}")
            return enriched_chunks
            
        except Exception as e:
            error_msg = f"文档切片（包含元数据）失败: {str(e)}"
            logger.error(error_msg)
            db_manager.update_status(file_id, "failed", error_msg)
            db_manager.add_log(file_id, "ERROR", error_msg)
            raise Exception(error_msg)
    
    def get_chunks_from_file(self, file_id: str) -> Optional[List[Dict[str, Any]]]:
        """从文件读取切片"""
        try:
            chunks_file = self.output_dir / f"{file_id}_chunks.json"
            if chunks_file.exists():
                with open(chunks_file, 'r', encoding='utf-8') as f:
                    chunks = json.load(f)
                return chunks
            return None
        except Exception as e:
            logger.error(f"读取切片文件失败: {str(e)}")
            return None
    
    def get_chunking_info(self, file_id: str) -> Optional[Dict[str, Any]]:
        """获取切片信息"""
        file_status = db_manager.get_file_status(file_id)
        if file_status and file_status.chunk_count > 0:
            chunks_file = self.output_dir / f"{file_id}_chunks.json"
            if chunks_file.exists():
                return {
                    'file_id': file_id,
                    'chunk_count': file_status.chunk_count,
                    'chunk_time': file_status.chunk_time,
                    'chunks_file': str(chunks_file),
                    'status': file_status.status
                }
        return None
    
    def validate_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """验证切片质量"""
        if not chunks:
            return {'valid': False, 'error': '切片列表为空'}
        
        total_chars = sum(len(chunk['content']) for chunk in chunks)
        avg_chunk_size = total_chars / len(chunks)
        
        # 检查切片大小分布
        size_distribution = {}
        for chunk in chunks:
            size_range = (len(chunk['content']) // 100) * 100
            size_distribution[size_range] = size_distribution.get(size_range, 0) + 1
        
        # 检查是否有空切片
        empty_chunks = [chunk for chunk in chunks if not chunk['content'].strip()]
        
        validation_result = {
            'valid': len(empty_chunks) == 0,
            'total_chunks': len(chunks),
            'total_characters': total_chars,
            'average_chunk_size': avg_chunk_size,
            'size_distribution': size_distribution,
            'empty_chunks': len(empty_chunks),
            'warnings': []
        }
        
        if empty_chunks:
            validation_result['warnings'].append(f"发现 {len(empty_chunks)} 个空切片")
        
        if avg_chunk_size < self.chunk_size * 0.5:
            validation_result['warnings'].append("平均切片大小偏小")
        
        if avg_chunk_size > self.chunk_size * 1.5:
            validation_result['warnings'].append("平均切片大小偏大")
        
        return validation_result

# 全局文档切片器实例
doc_chunker = DocumentChunker()
