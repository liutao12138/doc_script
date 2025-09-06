"""
配置文件
"""
import os
from dotenv import load_dotenv

load_dotenv()

# API配置
URL1 = os.getenv("URL1", "http://localhost:8000/api/files")  # 查询文件列表
URL2 = os.getenv("URL2", "http://localhost:8000/api/download")  # 下载文件
URL3 = os.getenv("URL3", "http://localhost:8000/api/vectorize")  # 生成向量
URL4 = os.getenv("URL4", "http://localhost:8000/api/save")  # 保存数据

# Redis服务配置
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))

# Celery配置
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}")

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./doc_processing.db")

# 文件存储配置
DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR", "./downloads")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs")

# OpenAI配置
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# 日志配置
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", "./logs/doc_processing.log")

# 处理配置
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))
