"""
Celery应用配置
"""
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from src.core.config import CELERY_BROKER_URL, CELERY_RESULT_BACKEND, MAX_RETRIES
from src.core.database import db_manager
from loguru import logger
import traceback

# 创建Celery应用
celery_app = Celery(
    'doc_processing',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=['src.tasks.tasks']
)

# Celery配置
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1小时超时
    task_soft_time_limit=3300,  # 55分钟软超时
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=True,
    task_default_retry_delay=60,  # 重试延迟60秒
    task_max_retries=MAX_RETRIES,
    result_expires=3600,  # 结果过期时间1小时
)

@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    """任务开始前的处理"""
    if 'file_id' in kwargs:
        file_id = kwargs['file_id']
        logger.info(f"任务开始执行: {task.name}, 文件ID: {file_id}, 任务ID: {task_id}")
        db_manager.add_log(file_id, "INFO", f"任务开始执行: {task.name}", task_id)

@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **kwds):
    """任务完成后的处理"""
    if 'file_id' in kwargs:
        file_id = kwargs['file_id']
        logger.info(f"任务执行完成: {task.name}, 文件ID: {file_id}, 任务ID: {task_id}, 状态: {state}")
        db_manager.add_log(file_id, "INFO", f"任务执行完成: {task.name}, 状态: {state}", task_id)

@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, einfo=None, **kwds):
    """任务失败处理"""
    logger.error(f"任务执行失败: {sender.name}, 任务ID: {task_id}, 异常: {exception}")
    
    # 尝试从任务参数中获取file_id
    try:
        # 这里需要根据实际任务参数结构来获取file_id
        # 由于信号处理器的限制，我们可能无法直接获取kwargs
        # 在实际任务中会处理失败情况
        pass
    except Exception as e:
        logger.error(f"处理任务失败信号时出错: {e}")

# 任务路由配置
celery_app.conf.task_routes = {
    'src.tasks.tasks.query_files': {'queue': 'query_queue'},
    'src.tasks.tasks.download_file': {'queue': 'download_queue'},
    'src.tasks.tasks.convert_document': {'queue': 'convert_queue'},
    'src.tasks.tasks.chunk_document': {'queue': 'chunk_queue'},
    'src.tasks.tasks.vectorize_chunks': {'queue': 'vectorize_queue'},
    'src.tasks.tasks.save_data': {'queue': 'save_queue'},
    'src.tasks.tasks.process_single_file': {'queue': 'process_queue'},
}

# 队列配置
celery_app.conf.task_default_queue = 'default'
celery_app.conf.task_queues = {
    'default': {
        'exchange': 'default',
        'routing_key': 'default',
    },
    'query_queue': {
        'exchange': 'query',
        'routing_key': 'query',
    },
    'download_queue': {
        'exchange': 'download',
        'routing_key': 'download',
    },
    'convert_queue': {
        'exchange': 'convert',
        'routing_key': 'convert',
    },
    'chunk_queue': {
        'exchange': 'chunk',
        'routing_key': 'chunk',
    },
    'vectorize_queue': {
        'exchange': 'vectorize',
        'routing_key': 'vectorize',
    },
    'save_queue': {
        'exchange': 'save',
        'routing_key': 'save',
    },
    'process_queue': {
        'exchange': 'process',
        'routing_key': 'process',
    },
}

if __name__ == '__main__':
    celery_app.start()
