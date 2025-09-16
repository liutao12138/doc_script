# 文件管理系统

一个现代化的文件管理系统，支持代理和本地打桩数据功能。

## ✨ 特性

- 🎨 现代化 UI 设计
- 🔄 智能代理切换
- 📊 本地打桩数据
- 🔍 高级搜索和过滤
- 📱 响应式设计
- ⚡ 实时状态监控

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发环境

#### 方式一：使用打桩数据（推荐）
```bash
npm run start:mock
```

#### 方式二：使用智能代理
```bash
npm run start:dev
```

#### 方式三：禁用Mock，仅连接真实后端
```bash
npm run start:no-mock
```

#### 方式四：标准启动（根据环境变量决定）
```bash
npm start
```

## 🔧 配置说明

### 环境变量

创建 `.env` 文件（可选）：
```bash
NODE_ENV=development
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_API_TARGET=http://localhost:8000
REACT_APP_USE_MOCK=true
REACT_APP_MOCK_DELAY=500
```

### 代理配置

项目支持两种模式：

1. **代理模式**：当后端服务可用时，自动代理到真实后端
2. **打桩模式**：当后端不可用时，自动使用本地打桩数据

## 📊 打桩数据

### 数据特性
- **20条模拟数据**：包含各种文件类型和状态
- **完整功能支持**：
  - NID 搜索
  - 状态过滤（待处理、处理中、已完成、已拒绝）
  - 文件类型过滤
  - 分页功能
- **真实网络延迟**：200-700ms 随机延迟

### 支持的文件类型
PDF, DOCX, PNG, SQL, MD, XLSX, SH, JSON, LOG, PPTX, TXT, XML, BAT, YAML, CSV, DRAWIO

### 支持的状态
- 🟡 待处理
- 🔵 处理中  
- 🟢 已完成
- 🔴 已拒绝

## 🛠️ 开发

### 项目结构
```
src/
├── components/          # React 组件
│   ├── FileList.tsx    # 文件列表组件
│   └── FileList.css    # 样式文件
├── mock/               # 打桩数据
│   └── mockData.json   # 模拟数据
├── api.ts              # API 接口
├── types.ts            # TypeScript 类型定义
└── App.tsx             # 主应用组件
```

### 添加新的打桩数据

编辑 `src/mock/mockData.json` 文件，添加新的数据项：

```json
{
  "id": 21,
  "nid": "DOC021",
  "file_name": "新文件.pdf",
  "file_path": "/uploads/docs/new_file.pdf",
  "file_size": 1024000,
  "file_type": "PDF",
  "handle_status": "待处理",
  "upload_time": "2024-01-17 10:00:00",
  "handle_time": null,
  "handle_user": null,
  "remark": "新文件描述"
}
```

### 自定义代理目标

修改 `webpack.config.js` 中的代理配置：

```javascript
proxy: {
  '/api': {
    target: 'http://your-backend-server:port',
    changeOrigin: true,
    secure: false
  }
}
```

## 📱 界面预览

- **现代化设计**：采用卡片式布局和渐变色彩
- **响应式布局**：支持桌面端和移动端
- **状态指示器**：实时显示 API 连接状态
- **交互反馈**：悬停效果和加载动画

## 🔍 API 接口

### 健康检查
```
GET /api/health
```

### 文件列表
```
POST /api/doc/list
Content-Type: application/json

{
  "nid": "DOC001",
  "page": 1,
  "pageSize": 10,
  "handle_status": ["待处理", "处理中"],
  "file_type": ["PDF", "DOCX"]
}
```

## 🚀 部署

### 构建生产版本
```bash
npm run build
```

### 生产环境配置
设置环境变量 `REACT_APP_API_URL` 为生产环境 API 地址。

## 📄 许可证

MIT License