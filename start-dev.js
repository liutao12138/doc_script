#!/usr/bin/env node

/**
 * 开发环境启动脚本
 * 支持代理和打桩数据自动切换
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动文件管理系统开发环境...\n');

// 设置环境变量
process.env.NODE_ENV = 'development';
process.env.REACT_APP_API_URL = 'http://localhost:3000/api';
process.env.REACT_APP_API_TARGET = 'http://localhost:8080';
process.env.REACT_APP_USE_MOCK = 'true';

console.log('📋 环境配置:');
console.log(`   - 前端端口: 3000`);
console.log(`   - API 代理目标: ${process.env.REACT_APP_API_TARGET}`);
console.log(`   - 打桩数据: ${process.env.REACT_APP_USE_MOCK === 'true' ? '启用' : '禁用'}`);
console.log('');

// 启动 webpack dev server
const webpackProcess = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname)
});

webpackProcess.on('error', (error) => {
  console.error('❌ 启动失败:', error.message);
  process.exit(1);
});

webpackProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ 进程退出，代码: ${code}`);
    process.exit(code);
  }
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭开发服务器...');
  webpackProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 正在关闭开发服务器...');
  webpackProcess.kill('SIGTERM');
  process.exit(0);
});
