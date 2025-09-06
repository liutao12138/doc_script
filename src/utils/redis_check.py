"""
Redis连接检查工具
"""
import redis
from ..core.config import REDIS_HOST, REDIS_PORT, REDIS_DB

def check_redis_connection():
    """检查Redis连接"""
    try:
        # 创建Redis连接
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)
        
        # 测试连接
        response = r.ping()
        if response:
            print(f"✓ Redis连接成功: {REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}")
            
            # 获取Redis信息
            info = r.info()
            print(f"  - Redis版本: {info.get('redis_version', 'Unknown')}")
            print(f"  - 内存使用: {info.get('used_memory_human', 'Unknown')}")
            print(f"  - 连接数: {info.get('connected_clients', 'Unknown')}")
            
            return True
        else:
            print("✗ Redis连接失败: ping无响应")
            return False
            
    except redis.ConnectionError as e:
        print(f"✗ Redis连接失败: {e}")
        print(f"  请确保Redis服务正在运行在 {REDIS_HOST}:{REDIS_PORT}")
        return False
    except Exception as e:
        print(f"✗ Redis连接失败: {e}")
        return False

def test_redis_operations():
    """测试Redis基本操作"""
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)
        
        # 测试写入
        r.set("test_key", "test_value", ex=10)  # 10秒过期
        
        # 测试读取
        value = r.get("test_key")
        if value == "test_value":
            print("✓ Redis读写操作正常")
            
            # 清理测试数据
            r.delete("test_key")
            return True
        else:
            print("✗ Redis读写操作异常")
            return False
            
    except Exception as e:
        print(f"✗ Redis操作测试失败: {e}")
        return False

def main():
    """主函数"""
    print("=== Redis连接检查 ===")
    print(f"Redis服务: {REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}")
    print()
    
    # 检查连接
    if check_redis_connection():
        print()
        # 测试操作
        test_redis_operations()
    else:
        print("\n请检查Redis服务状态:")
        print("1. 确保Redis已安装")
        print("2. 启动Redis服务:")
        print("   - Windows: redis-server")
        print("   - Linux/Mac: sudo systemctl start redis 或 brew services start redis")
        print("3. 检查防火墙设置")

if __name__ == '__main__':
    main()
