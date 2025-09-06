"""
服务启动脚本
"""
import subprocess
import sys
import time
import os
from pathlib import Path

def check_redis():
    """检查Redis服务"""
    try:
        sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
        from src.utils.redis_check import check_redis_connection
        return check_redis_connection()
    except Exception as e:
        print(f"✗ Redis服务检查失败: {e}")
        return False

def start_redis():
    """启动Redis服务"""
    try:
        print("检查Redis服务...")
        if check_redis():
            print("✓ Redis服务已运行")
            return True
        
        print("启动Redis服务...")
        subprocess.Popen(['redis-server'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(3)
        
        if check_redis():
            print("✓ Redis服务启动成功")
            return True
        else:
            print("✗ Redis服务启动失败")
            return False
    except Exception as e:
        print(f"Redis服务启动失败: {e}")
        return False

def start_celery_worker():
    """启动Celery Worker"""
    try:
        print("启动Celery Worker...")
        cmd = ['celery', '-A', 'src.tasks.celery_app', 'worker', '--loglevel=info', '--concurrency=4']
        subprocess.Popen(cmd)
        time.sleep(2)
        print("Celery Worker启动成功")
        return True
    except Exception as e:
        print(f"Celery Worker启动失败: {e}")
        return False

def start_celery_flower():
    """启动Celery Flower监控"""
    try:
        print("启动Celery Flower...")
        cmd = ['celery', '-A', 'src.tasks.celery_app', 'flower']
        subprocess.Popen(cmd)
        time.sleep(2)
        print("Celery Flower启动成功，访问 http://localhost:5555")
        return True
    except Exception as e:
        print(f"Celery Flower启动失败: {e}")
        return False

def create_directories():
    """创建必要的目录"""
    directories = [
        'downloads',
        'downloads/temp',
        'outputs',
        'outputs/markdown',
        'outputs/chunks',
        'logs'
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"创建目录: {directory}")

def main():
    """主函数"""
    print("=== 文档处理服务启动脚本 ===")
    
    # 创建必要目录
    create_directories()
    
    # 检查环境变量文件
    if not Path('.env').exists():
        print("警告: .env文件不存在，请复制env_example.txt为.env并配置相关参数")
    
    # 启动服务
    services = []
    
    # 启动Redis
    if start_redis():
        services.append("Redis")
    
    # 启动Celery Worker
    if start_celery_worker():
        services.append("Celery Worker")
    
    # 启动Celery Flower
    if start_celery_flower():
        services.append("Celery Flower")
    
    print(f"\n启动的服务: {', '.join(services)}")
    print("\n服务启动完成！")
    print("使用 'python main.py --action status' 查看处理状态")
    print("使用 'python main.py --action query' 开始处理文件")
    print("按 Ctrl+C 停止服务")

if __name__ == '__main__':
    try:
        main()
        # 保持脚本运行
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n正在停止服务...")
        sys.exit(0)
