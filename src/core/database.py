"""
数据库模型和状态管理
"""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from typing import Optional, List, Dict, Any
import json
from .config import DATABASE_URL

Base = declarative_base()

class FileProcessingStatus(Base):
    """文件处理状态表"""
    __tablename__ = "file_processing_status"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(String(255), unique=True, nullable=False, index=True)
    file_name = Column(String(500), nullable=False)
    file_url = Column(String(1000))
    file_size = Column(Integer)
    file_type = Column(String(50))
    
    # 处理状态
    status = Column(String(50), default="pending")  # pending, downloading, downloaded, converting, converted, chunking, chunked, vectorizing, vectorized, saving, completed, failed
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 处理结果
    download_path = Column(String(1000))
    markdown_path = Column(String(1000))
    chunk_count = Column(Integer, default=0)
    vector_count = Column(Integer, default=0)
    
    # 错误信息
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # 元数据
    metadata_json = Column(Text)  # 存储原始元数据
    
    # 处理时间统计
    download_time = Column(Float)
    convert_time = Column(Float)
    chunk_time = Column(Float)
    vectorize_time = Column(Float)
    save_time = Column(Float)
    total_time = Column(Float)

class ProcessingLog(Base):
    """处理日志表"""
    __tablename__ = "processing_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(String(255), nullable=False, index=True)
    task_id = Column(String(255))
    log_level = Column(String(20), nullable=False)  # INFO, WARNING, ERROR, DEBUG
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    extra_data = Column(Text)  # JSON格式的额外数据

class DatabaseManager:
    """数据库管理器"""
    
    def __init__(self):
        self.engine = create_engine(DATABASE_URL, echo=False)
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
    
    def add_file(self, file_id: str, file_name: str, file_url: str = None, 
                 file_size: int = None, file_type: str = None, 
                 metadata: Dict[str, Any] = None) -> FileProcessingStatus:
        """添加文件到处理队列"""
        file_status = FileProcessingStatus(
            file_id=file_id,
            file_name=file_name,
            file_url=file_url,
            file_size=file_size,
            file_type=file_type,
            metadata_json=json.dumps(metadata) if metadata else None
        )
        self.session.add(file_status)
        self.session.commit()
        return file_status
    
    def update_status(self, file_id: str, status: str, error_message: str = None, 
                     **kwargs) -> bool:
        """更新文件处理状态"""
        try:
            file_status = self.session.query(FileProcessingStatus).filter_by(file_id=file_id).first()
            if file_status:
                file_status.status = status
                file_status.updated_at = datetime.utcnow()
                
                if error_message:
                    file_status.error_message = error_message
                    file_status.retry_count += 1
                
                # 更新其他字段
                for key, value in kwargs.items():
                    if hasattr(file_status, key):
                        setattr(file_status, key, value)
                
                self.session.commit()
                return True
            return False
        except Exception as e:
            self.session.rollback()
            raise e
    
    def get_file_status(self, file_id: str) -> Optional[FileProcessingStatus]:
        """获取文件处理状态"""
        return self.session.query(FileProcessingStatus).filter_by(file_id=file_id).first()
    
    def get_files_by_status(self, status: str) -> List[FileProcessingStatus]:
        """根据状态获取文件列表"""
        return self.session.query(FileProcessingStatus).filter_by(status=status).all()
    
    def get_all_files(self) -> List[FileProcessingStatus]:
        """获取所有文件"""
        return self.session.query(FileProcessingStatus).all()
    
    def get_failed_files(self) -> List[FileProcessingStatus]:
        """获取失败的文件"""
        return self.session.query(FileProcessingStatus).filter_by(status="failed").all()
    
    def get_pending_files(self) -> List[FileProcessingStatus]:
        """获取待处理的文件"""
        return self.session.query(FileProcessingStatus).filter_by(status="pending").all()
    
    def add_log(self, file_id: str, log_level: str, message: str, 
                task_id: str = None, extra_data: Dict[str, Any] = None):
        """添加处理日志"""
        log_entry = ProcessingLog(
            file_id=file_id,
            task_id=task_id,
            log_level=log_level,
            message=message,
            extra_data=json.dumps(extra_data) if extra_data else None
        )
        self.session.add(log_entry)
        self.session.commit()
    
    def get_file_logs(self, file_id: str) -> List[ProcessingLog]:
        """获取文件的处理日志"""
        return self.session.query(ProcessingLog).filter_by(file_id=file_id).order_by(ProcessingLog.timestamp).all()
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取处理统计信息"""
        total_files = self.session.query(FileProcessingStatus).count()
        completed_files = self.session.query(FileProcessingStatus).filter_by(status="completed").count()
        failed_files = self.session.query(FileProcessingStatus).filter_by(status="failed").count()
        pending_files = self.session.query(FileProcessingStatus).filter_by(status="pending").count()
        processing_files = self.session.query(FileProcessingStatus).filter(
            FileProcessingStatus.status.in_([
                "downloading", "converting", "chunking", "vectorizing", "saving"
            ])
        ).count()
        
        return {
            "total_files": total_files,
            "completed_files": completed_files,
            "failed_files": failed_files,
            "pending_files": pending_files,
            "processing_files": processing_files,
            "success_rate": (completed_files / total_files * 100) if total_files > 0 else 0
        }
    
    def close(self):
        """关闭数据库连接"""
        self.session.close()

# 全局数据库管理器实例
db_manager = DatabaseManager()
