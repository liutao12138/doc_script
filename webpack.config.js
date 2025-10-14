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
            const { nid, file_type } = req.body;

            // 支持按文件ID或文件类型重置
            let validFiles = [];
            let invalidFiles = [];
            const statusNames = { 0: '待处理', 1: '处理中', 2: '已完成', 3: '已拒绝' };

            if (nid && Array.isArray(nid) && nid.length > 0) {
              // 按文件ID重置
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

                  if (file.handle_status === 0) {
                    invalidFiles.push({
                      nid: fileId,
                      reason: `文件已经是待处理状态，无需重置（当前状态: ${currentStatus}）`
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
            } else if (file_type && Array.isArray(file_type) && file_type.length > 0) {
              // 按文件类型重置
              mockData.forEach((file, index) => {
                if (file_type.includes(file.file_type) && file.handle_status !== 0) {
                  const currentStatus = statusNames[file.handle_status];
                  validFiles.push({
                    nid: file.nid,
                    index: index,
                    currentStatus: currentStatus
                  });
                  // 将文件状态重置为待处理
                  mockData[index].handle_status = 0;
                  mockData[index].handle_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
                  mockData[index].handle_user = '系统';
                }
              });
            } else {
              return res.json({
                message: '参数错误：必须提供 nid 或 file_type 参数',
                nid_num: 0
              });
            }

            if (validFiles.length === 0) {
              return res.json({
                message: '没有文件需要重置',
                nid_num: 0
              });
            }

            const successMessage = `重置成功！共重置 ${validFiles.length} 个文件为待处理状态`;
            console.log(`[MOCK] ${successMessage}`);

            res.json({
              message: successMessage,
              nid_num: validFiles.length
            });
          }, Math.random() * 300 + 100); // 100-400ms 随机延迟
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

        // 文件详情片段查询接口
        devServer.app.post('/api/doc/detail/list', (req, res) => {
          console.log('[MOCK] 收到文件详情查询请求:', req.body);

          // 模拟网络延迟
          setTimeout(() => {
            const { nid, keyword = '', page = 1, page_size = 10 } = req.body;

            if (!nid) {
              return res.json({
                data: [],
                total: 0
              });
            }

            // 生成模拟的文件详情片段数据
            const generateMockDetails = (fileNid, count = 5) => {
              const details = [];
              const products = ['产品A', '产品B', '产品C', '产品D', '产品E', '产品F', '产品G', '产品H'];
              const languages = ['zh', 'en', 'ja', 'ko', 'fr'];
              const catalogs1 = ['技术文档', '用户手册', 'API文档', '操作指南', '故障排除', '安全指南', '性能优化', '部署文档'];
              const catalogs2 = ['基础操作', '高级功能', '配置说明', '常见问题', '最佳实践', '故障诊断', '维护指南', '升级说明'];
              const titles = [
                '系统安装指南', '用户权限管理', '数据备份恢复', '网络配置说明', '安全设置指南',
                '性能监控方法', '故障排除步骤', '升级操作流程', 'API接口说明', '数据库配置',
                '日志分析方法', '监控告警设置', '负载均衡配置', '缓存优化策略', '数据迁移指南'
              ];
              const contents = [
                '这是一个重要的技术文档片段，包含了详细的配置说明和操作步骤。',
                '用户可以通过这个文档了解如何正确配置系统参数，确保系统稳定运行。',
                '本片段详细介绍了系统的核心功能，包括数据存储、处理和分析等关键环节。',
                '安全配置是系统运行的重要保障，本片段提供了完整的安全设置指南。',
                '性能优化是提升系统效率的关键，这里包含了多种优化策略和最佳实践。'
              ];
              
              for (let i = 0; i < count; i++) {
                const titleIndex = i % titles.length;
                const contentIndex = i % contents.length;
                const detail = {
                  file_name: `document_${fileNid}_${String(i + 1).padStart(3, '0')}.doc`,
                  language: languages[Math.floor(Math.random() * languages.length)],
                  title: `${titles[titleIndex]} ${i + 1}${keyword ? ` - 包含关键词"${keyword}"` : ''}`,
                  product_name: products.slice(0, Math.floor(Math.random() * 3) + 1),
                  content: `${contents[contentIndex]}${keyword ? `关键词"${keyword}"在内容中出现。` : ''}这是第${i + 1}个文档片段的详细内容，包含了重要的技术信息和操作步骤。内容涵盖了系统配置、用户管理、数据处理、安全设置等多个方面的知识点，帮助用户更好地理解和使用系统功能。`,
                  view_url: `https://example.com/view/${fileNid}/fragment/${String(i + 1).padStart(3, '0')}`,
                  operation_procedure_remarks: `操作步骤说明 ${i + 1}：这是关于如何执行相关操作的详细说明，包含了具体的步骤和注意事项。请按照以下步骤进行操作：1. 检查系统状态 2. 配置相关参数 3. 执行操作流程 4. 验证结果。`,
                  cut_time: Date.now() - Math.floor(Math.random() * 86400000 * 30), // 30天内的随机时间
                  catalog_l1: catalogs1[Math.floor(Math.random() * catalogs1.length)],
                  catalog_l2: catalogs2[Math.floor(Math.random() * catalogs2.length)]
                };
                details.push(detail);
              }
              return details;
            };

            // 根据关键词过滤（如果提供）
            let mockDetails = generateMockDetails(nid, 50); // 生成50个片段用于测试分页
            
            if (keyword) {
              mockDetails = mockDetails.filter(detail => 
                detail.title.toLowerCase().includes(keyword.toLowerCase()) ||
                detail.content.toLowerCase().includes(keyword.toLowerCase()) ||
                detail.operation_procedure_remarks.toLowerCase().includes(keyword.toLowerCase())
              );
            }

            // 分页处理
            const startIndex = (page - 1) * page_size;
            const endIndex = startIndex + page_size;
            const paginatedDetails = mockDetails.slice(startIndex, endIndex);

            console.log(`[MOCK] 文件详情查询: nid=${nid}, keyword="${keyword}", 返回${paginatedDetails.length}条记录，共${mockDetails.length}条`);

            res.json({
              data: paginatedDetails,
              total: mockDetails.length
            });
          }, Math.random() * 500 + 200); // 200-700ms 随机延迟
        });
      } // 结束 useMock 条件块

      return middlewares;
    }
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
};
