# 完整文档处理流程指南

本文档介绍如何使用完整的文档处理流程，从文件下载到数据保存的全过程。

## 流程概述

完整的文档处理流程包含以下步骤：

1. **📝 查询文件列表** - 从API获取待处理的文件信息
2. **📥 下载文件** - 下载文件到本地临时目录
3. **🔄 转换文档** - 将文档转换为Markdown格式
4. **✂️ 切片文档** - 将Markdown文档切分为多个文本块
5. **🧠 向量化切片** - 将文本块转换为向量表示
6. **💾 保存数据** - 将向量数据保存到向量数据库

## 脚本说明

### 1. 完整流程脚本 (`scripts/complete_flow.py`)

这是生产环境使用的完整流程脚本，支持异步处理和错误重试。

#### 使用方法：

```bash
# 运行完整流程（处理所有查询到的文件）
python scripts/complete_flow.py

# 使用语义切片
python scripts/complete_flow.py --use-semantic

# 限制处理文件数量
python scripts/complete_flow.py --max-files 10

# 使用自定义查询参数
python scripts/complete_flow.py --query-params '{"type": "pdf", "limit": 5}'

# 查看处理状态
python scripts/complete_flow.py --status
```

#### 参数说明：

- `--query-params`: 查询参数（JSON格式）
- `--use-semantic`: 使用语义切片（默认使用简单切片）
- `--max-files`: 最大处理文件数量
- `--status`: 只显示处理状态，不执行处理

### 2. 演示流程脚本 (`scripts/demo_flow.py`)

这是演示用的简化脚本，展示完整的处理流程，使用模拟数据。

#### 使用方法：

```bash
# 运行演示流程
python scripts/demo_flow.py

# 查看处理状态
python scripts/demo_flow.py --status
```

## 处理流程详解

### 步骤1: 查询文件列表

```python
# 从API查询文件列表
files = file_ops.query_files(query_params)
```

- 调用配置的API接口获取文件列表
- 将文件信息保存到数据库
- 文件状态初始化为 `pending`

### 步骤2: 下载文件

```python
# 下载文件到本地
download_path = file_ops.download_file(file_id, file_url, file_name)
```

- 从文件URL下载文件
- 保存到临时目录
- 文件状态更新为 `downloaded`

### 步骤3: 转换文档

```python
# 转换为Markdown格式
markdown_path = doc_converter.convert_to_markdown(file_path, file_id)
```

- 使用Docling将文档转换为Markdown
- 支持PDF、Word、Excel等格式
- 文件状态更新为 `converted`

### 步骤4: 切片文档

```python
# 切片文档
chunks = doc_chunker.chunk_markdown(markdown_path, file_id, use_semantic)
```

- 将Markdown文档切分为多个文本块
- 支持简单切片和语义切片
- 文件状态更新为 `chunked`

### 步骤5: 向量化切片

```python
# 向量化文本块
vectorized_chunks = vectorizer.vectorize_chunks(chunks, file_id)
```

- 使用OpenAI Embedding将文本转换为向量
- 每个文本块生成对应的向量表示
- 文件状态更新为 `vectorized`

### 步骤6: 保存数据

```python
# 保存到向量数据库
success = vectorizer.save_data(vectorized_chunks, file_id)
```

- 将向量数据保存到配置的向量数据库
- 建立索引以便后续检索
- 文件状态更新为 `completed`

## 文件状态说明

文件在处理过程中会经历以下状态：

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
- `failed`: 处理失败

## 错误处理

### 自动重试

- 每个步骤都支持自动重试
- 最大重试次数：3次
- 重试延迟：指数退避策略

### 错误记录

- 所有错误都会记录到数据库
- 包含详细的错误信息和堆栈跟踪
- 支持错误分析和调试

### 失败文件处理

```bash
# 重试失败的文件
python scripts/main.py --action retry --max-retry 3
```

## 监控和日志

### 处理状态监控

```bash
# 查看处理状态
python scripts/main.py --action status
```

### 文件日志查看

```bash
# 查看特定文件的处理日志
python scripts/main.py --action logs --file-id "file_001"
```

### 清理旧文件

```bash
# 清理24小时前的失败文件
python scripts/main.py --action cleanup --older-than-hours 24
```

## 性能优化建议

### 1. 并发处理

- 使用Celery worker进行并发处理
- 根据服务器性能调整worker数量
- 监控系统资源使用情况

### 2. 内存管理

- 大文件处理时注意内存使用
- 及时清理临时文件
- 使用流式处理减少内存占用

### 3. 网络优化

- 使用连接池减少连接开销
- 设置合适的超时时间
- 实现断点续传功能

## 配置说明

### 环境变量

确保在 `.env` 文件中配置以下变量：

```env
# API配置
URL1=https://api.example.com/files
URL2=https://api.example.com/download
URL3=https://api.example.com/vectorize
URL4=https://api.example.com/save

# OpenAI配置
OPENAI_API_KEY=your_openai_api_key

# 数据库配置
DATABASE_URL=sqlite:///doc_processing.db

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# 目录配置
DOWNLOAD_DIR=./downloads
OUTPUT_DIR=./output

# 处理配置
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_RETRIES=3
```

## 故障排除

### 常见问题

1. **文件下载失败**
   - 检查网络连接
   - 验证文件URL是否有效
   - 检查文件大小限制

2. **文档转换失败**
   - 确认文件格式支持
   - 检查文件是否损坏
   - 验证Docling配置

3. **向量化失败**
   - 检查OpenAI API密钥
   - 验证API配额
   - 检查网络连接

4. **数据保存失败**
   - 检查向量数据库连接
   - 验证数据库权限
   - 检查存储空间

### 调试方法

1. **查看详细日志**
   ```bash
   tail -f logs/app.log
   ```

2. **检查数据库状态**
   ```bash
   python scripts/main.py --action status
   ```

3. **查看特定文件日志**
   ```bash
   python scripts/main.py --action logs --file-id "your_file_id"
   ```

## 扩展功能

### 自定义处理步骤

可以在 `src/services/` 目录下添加自定义处理服务：

```python
class CustomProcessor:
    def process(self, data):
        # 自定义处理逻辑
        return processed_data
```

### 添加新的文件格式支持

在 `src/services/document_converter.py` 中添加新的转换器：

```python
def convert_custom_format(self, file_path, file_id):
    # 自定义格式转换逻辑
    return markdown_path
```

### 集成其他向量数据库

在 `src/services/vectorizer.py` 中添加新的向量数据库支持：

```python
def save_to_custom_db(self, vectors, file_id):
    # 自定义向量数据库保存逻辑
    return success
```

## 总结

完整的文档处理流程提供了从文件获取到数据保存的端到端解决方案。通过合理配置和使用，可以高效地处理大量文档，为后续的检索和分析提供数据基础。

建议在生产环境中：

1. 使用完整的流程脚本进行批量处理
2. 配置适当的监控和告警
3. 定期清理临时文件和失败记录
4. 根据实际需求调整处理参数
5. 建立完善的错误处理和恢复机制
