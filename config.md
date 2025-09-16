# 代理和打桩数据配置说明

## 环境变量配置

创建 `.env` 文件在项目根目录，内容如下：

```bash
# 环境变量配置
NODE_ENV=development
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_API_TARGET=http://localhost:8000
REACT_APP_USE_MOCK=true
REACT_APP_MOCK_DELAY=500
```

## 代理配置

项目已配置 webpack dev server 代理，支持以下功能：

### 1. 代理到真实后端
- 当 `REACT_APP_API_TARGET` 指定的后端服务可用时，请求会被代理到真实后端
- 默认代理目标：`http://localhost:8000`

### 2. 本地打桩数据
- 当后端服务不可用时，自动使用本地打桩数据
- 打桩数据位置：`src/mock/mockData.json`
- 支持完整的过滤、分页功能

## 使用方法

### 开发模式（使用打桩数据）
```bash
npm run start:mock
```
- 前端运行在：http://localhost:3000
- 强制使用本地打桩数据
- 支持所有API功能（搜索、过滤、分页）

### 禁用Mock，仅连接真实后端
```bash
npm run start:no-mock
```
- 前端运行在：http://localhost:3000
- 禁用本地打桩数据
- 仅连接真实后端（需要后端服务运行在8000端口）

### 智能代理模式
```bash
npm run start:dev
```
- 优先连接真实后端
- 后端不可用时自动使用打桩数据

### 标准启动（根据环境变量决定）
```bash
npm start
```
- 根据 `REACT_APP_USE_MOCK` 环境变量决定是否使用Mock

## 打桩数据特性

- **20条模拟数据**：包含各种文件类型和状态
- **完整功能支持**：
  - NID 搜索
  - 状态过滤（待处理、处理中、已完成、已拒绝）
  - 文件类型过滤
  - 分页功能
- **真实网络延迟**：200-700ms 随机延迟
- **详细日志**：控制台显示请求和响应信息

## 文件类型支持

- PDF, DOCX, PNG, SQL, MD, XLSX, SH, JSON, LOG, PPTX, TXT, XML, BAT, YAML, CSV, DRAWIO

## 状态类型

- 待处理：黄色标签
- 处理中：蓝色标签  
- 已完成：绿色标签
- 已拒绝：红色标签
