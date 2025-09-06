# 文档处理系统

一个基于 Celery 的分布式文档处理系统，支持文档下载、转换、切片和向量化。

## 功能特性

- **文件查询**: 通过URL1查询文件列表（包含元数据信息）
- **文件下载**: 通过URL2下载文件
- **文档转换**: 使用Docling将文档转换为Markdown格式
- **文档切片**: 使用LlamaIndex对Markdown进行智能切片
- **向量化**: 通过URL3生成向量
- **数据保存**: 通过URL4保存处理结果
- **状态跟踪**: 使用SQLite记录处理状态和详细日志
- **错误处理**: 完善的错误处理和重试机制
- **任务队列**: 基于Celery的分布式任务处理

## 项目结构

```
doc_script/
├── src/                          # 源代码目录
│   ├── core/                     # 核心功能模块
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库操作
│   │   └── error_handler.py     # 错误处理
│   ├── services/                 # 业务服务模块
│   │   ├── file_operations.py   # 文件操作服务
│   │   ├── document_converter.py # 文档转换服务
│   │   ├── document_chunker.py  # 文档切片服务
│   │   └── vectorizer.py        # 向量化服务
│   ├── tasks/                    # 任务相关
│   │   ├── celery_app.py        # Celery应用配置
│   │   └── tasks.py             # 任务定义
│   └── utils/                    # 工具模块
│       ├── logger_config.py     # 日志配置
│       └── redis_check.py       # Redis检查
├── scripts/                      # 脚本目录
│   ├── main.py                  # 主程序入口
│   ├── start_services.py        # 服务启动脚本
│   └── start_services.bat       # Windows启动脚本
├── config/                       # 配置文件目录
│   └── env_example.txt          # 环境变量模板
├── docs/                         # 文档目录
│   └── README.md                # 详细文档
└── requirements.txt              # Python依赖
```

## 功能模块说明

### 核心模块 (src/core/)
- **config.py**: 系统配置管理，包含API地址、数据库连接、Redis配置等
- **database.py**: 数据库模型和操作，管理文件处理状态
- **error_handler.py**: 统一错误处理和重试机制

### 服务模块 (src/services/)
- **file_operations.py**: 文件查询和下载服务
- **document_converter.py**: 使用Docling进行文档格式转换
- **document_chunker.py**: 使用LlamaIndex进行文档切片
- **vectorizer.py**: 文档向量化和数据保存

### 任务模块 (src/tasks/)
- **celery_app.py**: Celery应用配置和任务管理
- **tasks.py**: 具体的异步任务定义

### 工具模块 (src/utils/)
- **logger_config.py**: 日志系统配置
- **redis_check.py**: Redis连接检查工具

## 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 配置环境变量
```bash
cp config/env_example.txt .env
```

编辑`.env`文件，配置相关参数：
```bash
# API配置
URL1=http://localhost:8000/api/files
URL2=http://localhost:8000/api/download
URL3=http://localhost:8000/api/vectorize
URL4=http://localhost:8000/api/save

# Celery配置
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# OpenAI配置
OPENAI_API_KEY=your_openai_api_key_here

# 其他配置...
```

### 3. 启动服务

**方法1: 使用自动启动脚本（推荐）**
```bash
# Windows
scripts/start_services.bat

# 或手动启动
python scripts/start_services.py
```

**方法2: 手动启动**
```bash
# 启动Redis
redis-server

# 启动Celery Worker
celery -A src.tasks.celery_app worker --loglevel=info --concurrency=4

# 启动Celery Flower（可选，用于监控）
celery -A src.tasks.celery_app flower
```

### 4. 运行主程序
```bash
python scripts/main.py
```

## 使用方法

### 查询并处理文件
```bash
python scripts/main.py --action query
```

### 处理单个文件
```bash
python scripts/main.py --action process --file-id "your_file_id"
```

### 使用语义切片
```bash
python scripts/main.py --action process --file-id "your_file_id" --use-semantic
```

### 重试失败的文件
```bash
python scripts/main.py --action retry --max-retry 3
```

### 查看处理状态
```bash
python scripts/main.py --action status
```

### 查看文件日志
```bash
python scripts/main.py --action logs --file-id "your_file_id"
```

### 清理旧文件
```bash
python scripts/main.py --action cleanup --older-than-hours 24
```

## 处理流程

1. **查询文件**: 调用URL1获取文件列表和元数据
2. **下载文件**: 调用URL2下载文件到本地
3. **转换文档**: 使用Docling将文档转换为Markdown
4. **文档切片**: 使用LlamaIndex对Markdown进行切片
5. **向量化**: 调用URL3生成向量
6. **保存数据**: 调用URL4保存处理结果

## 状态管理

系统使用SQLite数据库跟踪文件处理状态：

- `pending`: 待处理
- `downloading`: 下载中
- `downloaded`: 已下载
- `converting`: 转换中
- `converted`: 已转换
- `chunking`: 切片中
- `chunked`: 已切片
- `vectorizing`: 向量化中
- `vectorized`: 已向量化
- `saving`: 保存中
- `completed`: 已完成
- `failed`: 失败

## 日志系统

- **控制台日志**: 实时显示处理进度
- **文件日志**: 详细记录到`logs/doc_processing.log`
- **错误日志**: 错误信息记录到`logs/error.log`
- **处理日志**: 处理步骤记录到`logs/processing.log`

## 错误处理

- 自动重试机制（可配置重试次数）
- 指数退避策略
- 详细的错误日志记录
- 失败文件状态跟踪

## 性能优化

- 批量处理切片向量化
- 并发任务处理
- 智能重试机制
- 资源清理功能

## Redis管理

系统提供了便捷的Redis管理功能：

### 检查Redis连接
```bash
python -c "from src.utils.redis_check import check_redis_connection; check_redis_connection()"
```

### 自动启动服务
```bash
# 自动启动所有服务（包括Redis检查）
python scripts/start_services.py

# Windows一键启动
scripts/start_services.bat
```

## 监控

通过Celery Flower可以监控：
- 任务执行状态
- Worker状态
- 任务历史
- 性能统计

## 技术栈

- **Python 3.8+**
- **Celery**: 分布式任务队列
- **SQLAlchemy**: 数据库ORM
- **Redis**: 消息代理和缓存
- **Docling**: 文档转换
- **LlamaIndex**: 文档切片和向量化
- **Loguru**: 日志系统

## 注意事项

1. 确保Redis服务正常运行
2. 配置正确的API端点URL
3. 设置有效的OpenAI API密钥（用于语义切片）
4. 确保有足够的磁盘空间存储下载和输出文件
5. 定期清理旧文件以释放存储空间

## 故障排除

### 常见问题

1. **Redis连接失败**: 检查Redis服务是否启动
2. **API调用失败**: 检查URL配置和网络连接
3. **文件下载失败**: 检查文件URL和权限
4. **转换失败**: 检查文件格式是否支持
5. **向量化失败**: 检查OpenAI API密钥和网络连接

### 日志查看

```bash
# 查看实时日志
tail -f logs/doc_processing.log

# 查看错误日志
tail -f logs/error.log

# 查看处理日志
tail -f logs/processing.log
```

## 扩展功能

- 支持更多文档格式
- 自定义切片策略
- 多种向量化模型
- 分布式处理
- 实时监控面板