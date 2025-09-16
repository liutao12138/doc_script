const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new webpack.DefinePlugin({
      'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || 'http://localhost:3000/api'),
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    open: true,
    hot: true,
    proxy: {
      '/api': {
        target: process.env.REACT_APP_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug',
        onProxyReq: (proxyReq, req, res) => {
          console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.getHeader('host')}${proxyReq.path}`);
        },
        onError: (err, req, res) => {
          console.log(`[PROXY ERROR] ${err.message} - 将使用本地打桩数据`);
          // 代理失败时，让请求继续到本地中间件处理
        }
      }
    },
    setupMiddlewares: (middlewares, devServer) => {
      // 检查是否启用mock
      const useMock = String(process.env.REACT_APP_USE_MOCK).trim() === 'true';
      console.log('[WEBPACK] REACT_APP_USE_MOCK:', process.env.REACT_APP_USE_MOCK);
      console.log('[WEBPACK] useMock:', useMock);

      if (!useMock) {
        return middlewares;
      } 

      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // 添加 body-parser 中间件
      const bodyParser = require('body-parser');
      devServer.app.use(bodyParser.json());
      devServer.app.use(bodyParser.urlencoded({ extended: true }));

      // 加载mock数据（无论是否启用mock都要加载，用于调试）
      let mockData = null;
      try {
        mockData = require('./src/mock/mockData.json');
        console.log('[MOCK] Mock数据加载成功，记录数:', mockData.length);
      } catch (error) {
        console.error('[MOCK] 加载Mock数据失败:', error.message);
      }

      // 只有在启用mock时才注册mock端点
      if (useMock) {
        console.log('[MOCK] 启用Mock模式，注册桩数据端点');

        // 健康检查端点
        devServer.app.get('/api/health', (req, res) => {
          res.json({
            code: 200,
            message: 'Mock server is running',
            data: {
              timestamp: new Date().toISOString(),
              mockDataCount: mockData ? mockData.length : 0
            }
          });
        });

        // 测试端点
        devServer.app.get('/api/test', (req, res) => {
          res.json({
            code: 200,
            message: 'Mock test endpoint',
            data: {
              useMock: useMock,
              mockDataLoaded: !!mockData,
              mockDataCount: mockData ? mockData.length : 0
            }
          });
        });

        devServer.app.post('/api/doc/list', (req, res) => {
          console.log('[MOCK] 收到文件列表请求:', req.body);

          // 模拟网络延迟
          setTimeout(() => {
            const { nid, page = 1, page_size = 10, handle_status, file_type } = req.body;

            let filteredData = [...mockData];

            // 应用过滤条件
            if (nid) {
              filteredData = filteredData.filter(item =>
                item.nid.toLowerCase().includes(nid.toLowerCase())
              );
            }

            if (handle_status && handle_status.length > 0) {
              filteredData = filteredData.filter(item =>
                handle_status.includes(item.handle_status)
              );
            }

            if (file_type && file_type.length > 0) {
              filteredData = filteredData.filter(item =>
                file_type.includes(item.file_type)
              );
            }

            // 分页
            const startIndex = (page - 1) * page_size;
            const endIndex = startIndex + page_size;
            const paginatedData = filteredData.slice(startIndex, endIndex);

            // 返回格式与后端接口保持一致: {data: [], total: 20}
            const response = {
              data: paginatedData,
              total: filteredData.length
            };

            console.log(`[MOCK] 返回数据: ${paginatedData.length} 条记录，共 ${filteredData.length} 条`);
            res.json(response);
          }, Math.random() * 500 + 200); // 200-700ms 随机延迟
        });

        // 重试文件处理 API
        devServer.app.post('/api/tasks/create', (req, res) => {
          console.log('[MOCK] 收到重试请求:', req.body);

          setTimeout(() => {
            const { nid, file_type } = req.body;

            // 如果指定了文件类型，则根据文件类型自动筛选文件
            if (file_type && file_type.length > 0) {
              console.log(`[MOCK] 根据文件类型筛选: ${file_type.join(', ')}`);

              // 基础支持的文件类型
              const baseFileTypes = ['PDF', 'DOCX', 'PNG', 'SQL', 'MD', 'XLSX', 'SH', 'JSON', 'LOG', 'PPTX', 'PPT', 'TXT', 'XML', 'BAT', 'YAML', 'CSV', 'DRAWIO', 'HDX'];

              // 验证文件类型格式（只检查格式，不限制具体类型）
              const invalidTypes = file_type.filter(type => {
                // 检查是否为有效的文件类型格式（2-10个字符，只包含字母和数字）
                return !/^[A-Z0-9]{2,10}$/.test(type);
              });

              if (invalidTypes.length > 0) {
                return res.json({
                  message: `无效的文件类型格式: ${invalidTypes.join(', ')}。文件类型应为2-10个字符的字母数字组合`,
                  nid_num: 0
                });
              }

              // 根据文件类型筛选所有符合条件的文件
              const validFiles = [];
              const skippedFiles = [];
              const statusCounts = { 0: 0, 1: 0, 2: 0, 3: 0 }; // 统计各状态文件数量

              mockData.forEach((file, index) => {
                // 统计该文件类型的所有文件状态
                if (file_type.includes(file.file_type)) {
                  statusCounts[file.handle_status] = (statusCounts[file.handle_status] || 0) + 1;

                  // 检查文件状态是否允许重试
                  if (file.handle_status === 1) {
                    // 进行中状态，不能重试
                    skippedFiles.push({
                      nid: file.nid,
                      reason: '文件正在处理中，无法重试'
                    });
                  } else if (file.handle_status === 0) {
                    // 待处理状态，可以重试
                    validFiles.push({
                      nid: file.nid,
                      index: index,
                      currentStatus: '待处理'
                    });
                  } else if (file.handle_status === 2) {
                    // 已完成状态，可以重试
                    validFiles.push({
                      nid: file.nid,
                      index: index,
                      currentStatus: '已完成'
                    });
                  } else if (file.handle_status === 3) {
                    // 已拒绝状态，可以重试
                    validFiles.push({
                      nid: file.nid,
                      index: index,
                      currentStatus: '已拒绝'
                    });
                  }
                }
              });

              // 生成详细的筛选结果信息
              const totalFiles = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
              const statusNames = { 0: '待处理', 1: '处理中', 2: '已完成', 3: '已拒绝' };
              const statusInfo = Object.entries(statusCounts)
                .filter(([_, count]) => count > 0)
                .map(([status, count]) => `${statusNames[status]}: ${count}个`)
                .join(', ');

              if (validFiles.length === 0) {
                return res.json({
                  message: `没有找到可重试的文件。文件类型 ${file_type.join(', ')} 的统计: 共${totalFiles}个文件 (${statusInfo})`,
                  nid_num: 0
                });
              }

              // 重置文件状态
              validFiles.forEach(({ index }) => {
                mockData[index].handle_status = 0;
                mockData[index].handle_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
                mockData[index].handle_user = '系统';
              });

              const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

              console.log(`[MOCK] 创建重试任务: ${taskId}, 文件数量: ${validFiles.length}`);
              console.log(`[MOCK] 文件类型筛选: ${file_type.join(', ')}`);
              console.log(`[MOCK] 筛选统计: 共${totalFiles}个文件 (${statusInfo}), 可重试${validFiles.length}个, 跳过${skippedFiles.length}个`);

              // 生成成功消息，包含详细信息
              let successMessage = `成功创建重试任务，共重试 ${validFiles.length} 个文件`;
              if (skippedFiles.length > 0) {
                successMessage += `，跳过 ${skippedFiles.length} 个正在处理中的文件`;
              }
              successMessage += `。文件类型统计: ${statusInfo}`;

              res.json({
                message: successMessage,
                nid_num: validFiles.length
              });

              return;
            }

            // 如果没有文件类型筛选，则使用原有的nid逻辑
            if (!file_type || file_type.length === 0) {
              if (!nid || !Array.isArray(nid) || nid.length === 0) {
                return res.json({
                  message: '参数错误：nid 必须是非空数组',
                  nid_num: 0
                });
              }
            }

            // 检查文件是否存在且状态允许重试
            const validFiles = [];
            const invalidFiles = [];
            const statusNames = { 0: '待处理', 1: '处理中', 2: '已完成', 3: '已拒绝' };

            nid.forEach(fileId => {
              const fileIndex = mockData.findIndex(item => item.nid === fileId);
              if (fileIndex === -1) {
                invalidFiles.push({
                  nid: fileId,
                  reason: '文件不存在'
                });
              } else {
                const file = mockData[fileIndex];
                const currentStatus = statusNames[file.handle_status];

                if (file.handle_status === 1) {
                  invalidFiles.push({
                    nid: fileId,
                    reason: `文件正在处理中，无法重试（当前状态: ${currentStatus}）`
                  });
                } else {
                  validFiles.push({
                    nid: fileId,
                    index: fileIndex,
                    currentStatus: currentStatus
                  });
                  // 将文件状态重置为待处理
                  mockData[fileIndex].handle_status = 0;
                  mockData[fileIndex].handle_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
                  mockData[fileIndex].handle_user = '系统';
                }
              }
            });

            if (validFiles.length === 0) {
              const errorDetails = invalidFiles.map(item => `${item.nid}: ${item.reason}`).join('; ');
              return res.json({
                message: `没有可重试的文件。详情: ${errorDetails}`,
                nid_num: 0
              });
            }

            const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            console.log(`[MOCK] 创建重试任务: ${taskId}, 文件数量: ${validFiles.length}`);
            console.log(`[MOCK] 重试详情: 成功${validFiles.length}个, 失败${invalidFiles.length}个`);

            // 生成详细的重试结果消息
            let successMessage = `成功创建重试任务，共重试 ${validFiles.length} 个文件`;
            if (invalidFiles.length > 0) {
              const failedDetails = invalidFiles.map(item => `${item.nid}(${item.reason})`).join(', ');
              successMessage += `，跳过 ${invalidFiles.length} 个文件: ${failedDetails}`;
            }

            res.json({
              message: successMessage,
              nid_num: validFiles.length
            });
          }, Math.random() * 300 + 100); // 100-400ms 随机延迟
        });

        // 重置文件状态 API
        devServer.app.post('/api/doc/reset/status', (req, res) => {
          console.log('[MOCK] 收到重置请求:', req.body);

          setTimeout(() => {
            const { nid, reset_all } = req.body;

            if (reset_all) {
              // 全局重置：将所有文件状态重置为待处理
              let resetCount = 0;
              mockData.forEach(item => {
                if (item.handle_status !== 0) {
                  item.handle_status = 0;
                  item.handle_time = null;
                  item.handle_user = null;
                  item.remark = '状态已重置';
                  resetCount++;
                }
              });

              console.log(`[MOCK] 全局重置完成，共重置 ${resetCount} 个文件`);

              res.json({
                message: `全局重置成功，共重置 ${resetCount} 个文档`,
                status: '0'
              });
            } else {
              // 单文件重置
              if (!nid) {
                return res.json({
                  message: '参数错误：nid 不能为空',
                  status: '1'
                });
              }

              const fileIndex = mockData.findIndex(item => item.nid === nid);
              if (fileIndex === -1) {
                return res.json({
                  message: '文件不存在',
                  status: '1'
                });
              }

              // 重置单个文件状态
              mockData[fileIndex].handle_status = 0;
              mockData[fileIndex].handle_time = null;
              mockData[fileIndex].handle_user = null;
              mockData[fileIndex].remark = '状态已重置';

              console.log(`[MOCK] 单文件重置完成: ${nid}`);

              res.json({
                message: `文档 ${nid} 状态已重置`,
                status: '0'
              });
            }
          }, Math.random() * 400 + 200); // 200-600ms 随机延迟
        });

        // 数据同步接口
        devServer.app.post('/api/doc/pull', (req, res) => {
          console.log('[MOCK] 收到数据同步请求');

          // 模拟网络延迟
          setTimeout(() => {
            console.log('[MOCK] 数据同步完成');

            // 无返回参数，直接返回 200 状态码
            res.status(200).end();
          }, Math.random() * 300 + 100); // 100-400ms 随机延迟
        });

        // 更新时间接口
        devServer.app.post('/api/doc/update/time', (req, res) => {
          console.log('[MOCK] 收到更新时间请求:', req.body);

          // 模拟网络延迟
          setTimeout(() => {
            const { nid, update_time, last_update_time } = req.body;

            if (!nid) {
              return res.json({
                code: 400,
                message: '参数错误：nid 不能为空',
                data: null
              });
            }

            const fileIndex = mockData.findIndex(item => item.nid === nid);
            if (fileIndex === -1) {
              return res.json({
                code: 404,
                message: '文件不存在',
                data: null
              });
            }

            const file = mockData[fileIndex];
            const oldUpdateTime = file.update_time;
            const oldLastUpdateTime = file.last_update_time;

            // 更新文件时间
            if (update_time !== undefined) {
              file.update_time = update_time;
            }
            if (last_update_time !== undefined) {
              file.last_update_time = last_update_time;
            }

            console.log(`[MOCK] 文件 ${nid} 时间更新完成`);

            res.json({
              code: 200,
              message: '更新时间成功',
              data: {
                nid: nid,
                old_update_time: oldUpdateTime,
                new_update_time: file.update_time,
                old_last_update_time: oldLastUpdateTime,
                new_last_update_time: file.last_update_time,
                update_time: new Date().toISOString().replace('T', ' ').substring(0, 19)
              }
            });
          }, Math.random() * 400 + 200); // 200-600ms 随机延迟
        });
      } // 结束 useMock 条件块

      return middlewares;
    }
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
};
