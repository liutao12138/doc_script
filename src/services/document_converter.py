"""
文档转换模块 - 使用Docling将文档转换为Markdown格式
"""
import time
from pathlib import Path
from typing import Optional, Dict, Any
from loguru import logger
from docling.document_converter import DocumentConverter as DoclingConverter
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
from ..core.config import OUTPUT_DIR
from ..core.database import db_manager

class DocumentConverter:
    """文档转换器类"""
    
    def __init__(self):
        self.output_dir = Path(OUTPUT_DIR) / "markdown"
        self.output_dir.mkdir(exist_ok=True)
        
        # 配置Docling转换器
        self.converter = self._setup_converter()
    
    def _setup_converter(self) -> DocumentConverter:
        """设置Docling转换器"""
        try:
            # 配置PDF处理选项
            pdf_options = PdfPipelineOptions()
            pdf_options.do_ocr = True  # 启用OCR
            pdf_options.do_table_structure = True  # 启用表格结构识别
            pdf_options.table_structure_options.do_cell_matching = True
            
            # 创建转换器
            converter = DoclingConverter(
                format_options={
                    InputFormat.PDF: pdf_options,
                }
            )
            
            logger.info("Docling转换器初始化成功")
            return converter
            
        except Exception as e:
            logger.error(f"Docling转换器初始化失败: {str(e)}")
            raise Exception(f"Docling转换器初始化失败: {str(e)}")
    
    def convert_to_markdown(self, file_path: str, file_id: str) -> str:
        """
        将文档转换为Markdown格式
        
        Args:
            file_path: 源文件路径
            file_id: 文件ID
            
        Returns:
            转换后的Markdown文件路径
        """
        start_time = time.time()
        
        try:
            # 更新状态为转换中
            db_manager.update_status(file_id, "converting")
            logger.info(f"开始转换文档: {file_id}, 文件路径: {file_path}")
            db_manager.add_log(file_id, "INFO", f"开始转换文档: {file_id}, 文件路径: {file_path}")
            
            # 检查源文件是否存在
            source_file = Path(file_path)
            if not source_file.exists():
                raise Exception(f"源文件不存在: {file_path}")
            
            # 确定输出文件名
            output_filename = f"{file_id}.md"
            output_path = self.output_dir / output_filename
            
            # 执行转换
            logger.info(f"开始Docling转换: {source_file} -> {output_path}")
            
            # 使用Docling转换文档
            result = self.converter.convert(str(source_file))
            
            # 获取转换后的内容
            if hasattr(result, 'document') and result.document:
                # 获取Markdown内容
                markdown_content = result.document.export_to_markdown()
                
                # 保存Markdown文件
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(markdown_content)
                
                convert_time = time.time() - start_time
                
                # 更新状态
                db_manager.update_status(
                    file_id,
                    "converted",
                    markdown_path=str(output_path),
                    convert_time=convert_time
                )
                
                logger.info(f"文档转换完成: {file_id}, 输出路径: {output_path}, 耗时: {convert_time:.2f}s")
                db_manager.add_log(
                    file_id,
                    "INFO",
                    f"文档转换完成: {file_id}, 输出路径: {output_path}, 耗时: {convert_time:.2f}s"
                )
                
                return str(output_path)
            else:
                raise Exception("Docling转换失败：未获取到转换结果")
                
        except Exception as e:
            error_msg = f"文档转换失败: {str(e)}"
            logger.error(error_msg)
            db_manager.update_status(file_id, "failed", error_msg)
            db_manager.add_log(file_id, "ERROR", error_msg)
            raise Exception(error_msg)
    
    def convert_with_metadata(self, file_path: str, file_id: str, 
                            metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        转换文档并包含元数据信息
        
        Args:
            file_path: 源文件路径
            file_id: 文件ID
            metadata: 元数据信息
            
        Returns:
            包含转换结果和元数据的字典
        """
        try:
            # 执行转换
            markdown_path = self.convert_to_markdown(file_path, file_id)
            
            # 读取转换后的内容
            with open(markdown_path, 'r', encoding='utf-8') as f:
                markdown_content = f.read()
            
            # 构建结果
            result = {
                'file_id': file_id,
                'markdown_path': markdown_path,
                'markdown_content': markdown_content,
                'content_length': len(markdown_content),
                'metadata': metadata or {}
            }
            
            # 添加文件信息
            file_status = db_manager.get_file_status(file_id)
            if file_status:
                result['file_name'] = file_status.file_name
                result['file_type'] = file_status.file_type
                result['file_size'] = file_status.file_size
                result['original_metadata'] = file_status.metadata_json
            
            logger.info(f"文档转换完成，包含元数据: {file_id}")
            return result
            
        except Exception as e:
            error_msg = f"文档转换（包含元数据）失败: {str(e)}"
            logger.error(error_msg)
            db_manager.update_status(file_id, "failed", error_msg)
            db_manager.add_log(file_id, "ERROR", error_msg)
            raise Exception(error_msg)
    
    def get_supported_formats(self) -> list:
        """获取支持的文档格式"""
        return [
            'pdf', 'doc', 'docx', 'txt', 'rtf',
            'odt', 'html', 'htm', 'xml', 'epub',
            'mobi', 'azw', 'azw3', 'fb2'
        ]
    
    def is_supported_format(self, file_path: str) -> bool:
        """检查文件格式是否支持"""
        file_extension = Path(file_path).suffix.lower().lstrip('.')
        return file_extension in self.get_supported_formats()
    
    def get_conversion_info(self, file_id: str) -> Optional[Dict[str, Any]]:
        """获取转换信息"""
        file_status = db_manager.get_file_status(file_id)
        if file_status and file_status.markdown_path:
            markdown_path = Path(file_status.markdown_path)
            if markdown_path.exists():
                with open(markdown_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                return {
                    'file_id': file_id,
                    'markdown_path': str(markdown_path),
                    'content_length': len(content),
                    'convert_time': file_status.convert_time,
                    'status': file_status.status
                }
        return None

# 全局文档转换器实例
doc_converter = DocumentConverter()
