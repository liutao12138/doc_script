// Mock数据生成器 - 用于生成大量测试数据
const fileTypes = ['PDF', 'DOCX', 'XLSX', 'PPTX', 'PNG', 'JPG', 'GIF', 'TXT', 'MD', 'JSON', 'XML', 'YAML', 'CSV', 'SQL', 'SH', 'BAT', 'LOG', 'DRAWIO'];
const handleStatuses = [0, 1, 2, 3]; // 0:未处理, 1:处理中, 2:已完成, 3:处理失败
const users = ['张三', '李四', '王五', '赵六', '周八', '吴九', '郑十', '王十一', '李十二', '张十三', '刘十四', '陈十五', '王十四', '张十五', '刘十六', '陈十七', '王十八', '张十九', '刘二十'];
const statusTexts = ['未处理', '处理中', '已完成', '处理失败'];

// 文件类型对应的处理状态权重
const fileTypeStatusWeights = {
  'PDF': { 0: 0.2, 1: 0.3, 2: 0.4, 3: 0.1 },
  'DOCX': { 0: 0.15, 1: 0.25, 2: 0.5, 3: 0.1 },
  'XLSX': { 0: 0.1, 1: 0.2, 2: 0.6, 3: 0.1 },
  'PPTX': { 0: 0.2, 1: 0.3, 2: 0.4, 3: 0.1 },
  'PNG': { 0: 0.1, 1: 0.2, 2: 0.6, 3: 0.1 },
  'JPG': { 0: 0.1, 1: 0.2, 2: 0.6, 3: 0.1 },
  'GIF': { 0: 0.1, 1: 0.2, 2: 0.6, 3: 0.1 },
  'TXT': { 0: 0.3, 1: 0.2, 2: 0.4, 3: 0.1 },
  'MD': { 0: 0.2, 1: 0.2, 2: 0.5, 3: 0.1 },
  'JSON': { 0: 0.1, 1: 0.3, 2: 0.5, 3: 0.1 },
  'XML': { 0: 0.15, 1: 0.25, 2: 0.5, 3: 0.1 },
  'YAML': { 0: 0.1, 1: 0.3, 2: 0.5, 3: 0.1 },
  'CSV': { 0: 0.1, 1: 0.2, 2: 0.6, 3: 0.1 },
  'SQL': { 0: 0.2, 1: 0.3, 2: 0.4, 3: 0.1 },
  'SH': { 0: 0.3, 1: 0.2, 2: 0.4, 3: 0.1 },
  'BAT': { 0: 0.3, 1: 0.2, 2: 0.4, 3: 0.1 },
  'LOG': { 0: 0.1, 1: 0.2, 2: 0.6, 3: 0.1 },
  'DRAWIO': { 0: 0.2, 1: 0.3, 2: 0.4, 3: 0.1 }
};

// 文件类型对应的文件大小范围（字节）
const fileSizeRanges = {
  'PDF': [500000, 10000000],
  'DOCX': [200000, 8000000],
  'XLSX': [100000, 5000000],
  'PPTX': [500000, 15000000],
  'PNG': [50000, 2000000],
  'JPG': [30000, 3000000],
  'GIF': [20000, 1000000],
  'TXT': [1000, 500000],
  'MD': [2000, 1000000],
  'JSON': [1000, 200000],
  'XML': [2000, 500000],
  'YAML': [1000, 300000],
  'CSV': [5000, 2000000],
  'SQL': [1000, 1000000],
  'SH': [500, 100000],
  'BAT': [500, 50000],
  'LOG': [10000, 5000000],
  'DRAWIO': [10000, 2000000]
};

// 文件类型对应的处理时间范围（秒）
const processTimeRanges = {
  'PDF': [30, 300],
  'DOCX': [20, 180],
  'XLSX': [15, 120],
  'PPTX': [25, 200],
  'PNG': [5, 30],
  'JPG': [5, 30],
  'GIF': [5, 30],
  'TXT': [2, 15],
  'MD': [3, 20],
  'JSON': [1, 10],
  'XML': [2, 15],
  'YAML': [1, 10],
  'CSV': [5, 60],
  'SQL': [10, 120],
  'SH': [1, 5],
  'BAT': [1, 5],
  'LOG': [10, 180],
  'DRAWIO': [15, 90]
};

// 文件名模板
const fileNameTemplates = {
  'PDF': ['需求文档', '技术规范', '用户手册', 'API文档', '设计文档', '测试报告', '项目计划', '会议纪要', '培训材料', '操作指南'],
  'DOCX': ['项目文档', '技术说明', '用户指南', '配置手册', '维护文档', '开发文档', '部署指南', '故障排除', '安全指南', '最佳实践'],
  'XLSX': ['数据统计', '财务报表', '测试用例', '配置清单', '用户列表', '日志分析', '性能报告', '资源清单', '进度跟踪', '质量报告'],
  'PPTX': ['项目演示', '技术分享', '培训课件', '产品介绍', '方案设计', '工作总结', '规划报告', '评审材料', '培训教程', '展示文档'],
  'PNG': ['界面截图', '设计稿', '流程图', '架构图', '数据图表', '操作界面', '系统截图', '错误截图', '效果图', '示意图'],
  'JPG': ['产品图片', '界面预览', '效果展示', '设计稿', '截图', '照片', '图标', '背景图', '装饰图', '示例图'],
  'GIF': ['动画演示', '操作流程', '效果展示', '动态图', '演示动画', '交互效果', '加载动画', '提示动画', '状态动画', '过渡效果'],
  'TXT': ['说明文档', '配置说明', '使用说明', '注意事项', '变更日志', '版本说明', '安装说明', '故障排除', '常见问题', '操作指南'],
  'MD': ['README', 'API文档', '开发指南', '部署说明', '配置指南', '使用手册', '技术文档', '项目说明', '更新日志', '贡献指南'],
  'JSON': ['配置文件', '数据配置', 'API配置', '系统配置', '环境配置', '参数配置', '规则配置', '模板配置', '默认配置', '用户配置'],
  'XML': ['配置文件', '数据模型', '接口定义', '模板文件', '规则文件', '映射文件', '结构定义', '元数据', '配置模板', '数据格式'],
  'YAML': ['配置文件', '部署配置', '环境配置', '服务配置', '管道配置', '工作流配置', 'CI配置', 'CD配置', '监控配置', '日志配置'],
  'CSV': ['数据导出', '用户数据', '日志数据', '统计数据', '报告数据', '分析数据', '测试数据', '配置数据', '历史数据', '备份数据'],
  'SQL': ['数据库脚本', '建表脚本', '数据脚本', '存储过程', '触发器', '视图定义', '索引脚本', '备份脚本', '恢复脚本', '优化脚本'],
  'SH': ['部署脚本', '启动脚本', '停止脚本', '备份脚本', '清理脚本', '监控脚本', '安装脚本', '配置脚本', '测试脚本', '维护脚本'],
  'BAT': ['批处理脚本', '安装脚本', '配置脚本', '启动脚本', '停止脚本', '备份脚本', '清理脚本', '测试脚本', '部署脚本', '维护脚本'],
  'LOG': ['系统日志', '应用日志', '错误日志', '访问日志', '操作日志', '调试日志', '审计日志', '性能日志', '安全日志', '监控日志'],
  'DRAWIO': ['流程图', '架构图', '时序图', '类图', '用例图', '状态图', '活动图', '组件图', '部署图', '网络图']
};

// 备注模板
const remarkTemplates = {
  0: ['待处理文档', '新上传文件', '等待处理', '待审核文档', '待分配任务', '待处理文件', '新文件待处理', '等待处理中', '待处理任务', '待处理文档'],
  1: ['正在处理中', '处理进行中', '审核中', '验证中', '分析中', '转换中', '解析中', '处理中', '正在审核', '处理进行中'],
  2: ['处理完成', '审核通过', '处理成功', '已完成', '处理完毕', '审核完成', '处理成功', '已完成处理', '处理完成', '审核通过'],
  3: ['处理失败', '审核不通过', '处理错误', '需要重新处理', '格式不支持', '文件损坏', '处理超时', '解析失败', '转换失败', '处理异常']
};

// 生成随机文件大小
function generateFileSize(fileType) {
  const range = fileSizeRanges[fileType] || [1000, 1000000];
  return Math.floor(Math.random() * (range[1] - range[0]) + range[0]);
}

// 生成随机处理时间
function generateProcessTime(fileType, handleStatus) {
  if (handleStatus === 0) return null;
  const range = processTimeRanges[fileType] || [1, 60];
  return Math.floor(Math.random() * (range[1] - range[0]) + range[0]);
}

// 根据文件类型和权重生成处理状态
function generateHandleStatus(fileType) {
  const weights = fileTypeStatusWeights[fileType] || { 0: 0.25, 1: 0.25, 2: 0.25, 3: 0.25 };
  const random = Math.random();
  let cumulative = 0;
  
  for (const [status, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (random <= cumulative) {
      return parseInt(status);
    }
  }
  
  return 0; // 默认未处理
}

// 生成文件名
function generateFileName(fileType) {
  const templates = fileNameTemplates[fileType] || ['文档'];
  const template = templates[Math.floor(Math.random() * templates.length)];
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `${template}_${timestamp}_${random}.${fileType.toLowerCase()}`;
}

// 生成备注
function generateRemark(handleStatus) {
  const templates = remarkTemplates[handleStatus] || ['文档'];
  const template = templates[Math.floor(Math.random() * templates.length)];
  const random = Math.floor(Math.random() * 1000);
  return `${template}_${random}`;
}

// 生成文件路径
function generateFilePath(fileType, fileName) {
  const pathMap = {
    'PDF': '/uploads/docs',
    'DOCX': '/uploads/docs',
    'XLSX': '/uploads/spreadsheets',
    'PPTX': '/uploads/presentations',
    'PNG': '/uploads/images',
    'JPG': '/uploads/images',
    'GIF': '/uploads/images',
    'TXT': '/uploads/texts',
    'MD': '/uploads/markdown',
    'JSON': '/uploads/configs',
    'XML': '/uploads/configs',
    'YAML': '/uploads/configs',
    'CSV': '/uploads/data',
    'SQL': '/uploads/scripts',
    'SH': '/uploads/scripts',
    'BAT': '/uploads/scripts',
    'LOG': '/uploads/logs',
    'DRAWIO': '/uploads/diagrams'
  };
  
  const basePath = pathMap[fileType] || '/uploads/files';
  return `${basePath}/${fileName}`;
}

// 生成查看URL
function generateViewUrl(fileType, filePath) {
  const viewUrlMap = {
    'PDF': 'https://view.officeapps.live.com/op/embed.aspx?src=',
    'DOCX': 'https://view.officeapps.live.com/op/embed.aspx?src=',
    'XLSX': 'https://view.officeapps.live.com/op/embed.aspx?src=',
    'PPTX': 'https://view.officeapps.live.com/op/embed.aspx?src=',
    'DRAWIO': 'https://app.diagrams.net/?lightbox=1&highlight=0000ff&edit=_blank&layers=1&nav=1&title='
  };
  
  const baseUrl = viewUrlMap[fileType] || 'https://example.com/view?src=';
  return `${baseUrl}https://example.com${filePath}`;
}

// 生成单个文件数据
function generateFileItem(id) {
  const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
  const handleStatus = generateHandleStatus(fileType);
  const fileName = generateFileName(fileType);
  const filePath = generateFilePath(fileType, fileName);
  const fileSize = generateFileSize(fileType);
  const processTime = generateProcessTime(fileType, handleStatus);
  const handleUser = handleStatus > 0 ? users[Math.floor(Math.random() * users.length)] : null;
  const currentTime = Date.now();
  const uploadTime = currentTime - Math.floor(Math.random() * 86400000 * 90); // 90天内的随机时间
  const handleTime = handleStatus > 0 ? uploadTime + Math.floor(Math.random() * 86400000 * 7) : null; // 上传后7天内处理
  
  return {
    id,
    nid: `DOC${String(id).padStart(3, '0')}`,
    name: fileName,
    file_path: filePath,
    file_size: fileSize,
    file_type: [fileType],
    handle_status: handleStatus,
    handle_count: handleStatus > 0 ? Math.floor(Math.random() * 5) + 1 : 0,
    upload_time: uploadTime,
    handle_time: handleTime,
    handle_user: handleUser,
    remark: generateRemark(handleStatus),
    update_time: uploadTime,
    handle_update_time: handleTime,
    status: handleStatus === 2 ? "1" : "0",
    process_time: processTime,
    view_url: generateViewUrl(fileType, filePath)
  };
}

// 生成指定数量的mock数据
function generateMockData(count = 100) {
  const data = [];
  for (let i = 1; i <= count; i++) {
    data.push(generateFileItem(i));
  }
  return data;
}

// 导出生成器函数
module.exports = {
  generateMockData,
  generateFileItem,
  fileTypes,
  handleStatuses,
  users
};
