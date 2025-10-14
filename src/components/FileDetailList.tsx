import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { FileDetailItem, FileDetailRequest } from '../types';
import { fetchFileDetails } from '../api';
import ToastContainer, { useToast } from './ToastContainer';
import { useFileListContext } from '../contexts/FileListContext';
import './FileDetailList.css';
import 'highlight.js/styles/github.css';

const FileDetailList: React.FC = () => {
  const { nid } = useParams<{ nid: string }>();
  const navigate = useNavigate();
  const { restoreState } = useFileListContext();
  const [details, setDetails] = useState<FileDetailItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [keyword, setKeyword] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageInput, setPageInput] = useState<string>('');
  
  // Toast 管理
  const { toasts, showSuccess, showError, removeToast } = useToast();

  // 加载文件详情数据
  const loadFileDetails = async (page: number = 1, searchKeyword: string = '') => {
    if (!nid) {
      setError('文件ID不能为空');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: FileDetailRequest = {
        nid,
        keyword: searchKeyword,
        page,
        page_size: pageSize
      };

      const response = await fetchFileDetails(request);
      setDetails(response.data);
      setTotal(response.total);
      setTotalPages(Math.ceil(response.total / pageSize));
      setCurrentPage(page);

      if (response.data.length === 0 && searchKeyword) {
        showError(`未找到包含关键词"${searchKeyword}"的文档片段`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载文件详情失败';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    if (nid) {
      loadFileDetails(1, keyword);
    }
  }, [nid]);

  // 组件挂载时确保数据加载
  useEffect(() => {
    if (nid && details.length === 0 && !loading && !error) {
      loadFileDetails(1, keyword);
    }
  }, []);

  // 搜索处理
  const handleSearch = () => {
    setCurrentPage(1);
    loadFileDetails(1, keyword);
  };

  // 重置搜索
  const handleReset = () => {
    setKeyword('');
    setCurrentPage(1);
    loadFileDetails(1, '');
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    loadFileDetails(page, keyword);
  };

  // 跳转到指定页面
  const handlePageJump = () => {
    const page = parseInt(pageInput);
    if (page >= 1 && page <= totalPages) {
      handlePageChange(page);
      setPageInput('');
    } else {
      showError(`请输入1到${totalPages}之间的页码`);
    }
  };

  // 每页条数变更
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    loadFileDetails(1, keyword);
  };

  // 返回文件列表
  const handleBack = () => {
    // 恢复保存的搜索条件
    restoreState();
    navigate('/');
  };

  // 查看详情
  const handleViewDetail = (viewUrl: string) => {
    if (viewUrl) {
      window.open(viewUrl, '_blank');
    } else {
      showError('查看链接不可用');
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 获取状态颜色
  const getStatusColor = (status: number) => {
    const colors = {
      0: '#f0f0f0', // 待处理
      1: '#e3f2fd', // 处理中
      2: '#e8f5e8', // 已完成
      3: '#ffebee'  // 已拒绝
    };
    return colors[status as keyof typeof colors] || '#f0f0f0';
  };

  if (!nid) {
    return (
      <div className="file-detail-container">
        <div className="error-message">
          <h2>错误</h2>
          <p>文件ID不能为空</p>
          <button onClick={handleBack} className="back-button">
            返回文件列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-detail-container">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* 固定头部区域 */}
      <div className="sticky-header">
        {/* 页面头部 */}
        <div className="detail-header">
          <div className="header-left">
            <button onClick={handleBack} className="back-button">
              ← 返回文件列表
            </button>
            <h1>文件详情 - {nid}</h1>
          </div>
          <div className="header-stats">
            <span className="total-count">共 {total} 个文档片段</span>
          </div>
        </div>

        {/* 搜索区域 */}
        <div className="search-section">
          <div className="search-input-group">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索文档片段内容..."
              className="search-input"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="search-button" disabled={loading}>
              搜索
            </button>
            <button onClick={handleReset} className="reset-button" disabled={loading}>
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="content-area">
        {/* 加载状态 */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>加载中...</span>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => loadFileDetails(currentPage, keyword)} className="retry-button">
              重试
            </button>
          </div>
        )}

        {/* 文档片段列表 */}
        {!loading && !error && (
          <div className="details-list">
            {details.length === 0 ? (
              <div className="empty-state">
                <p>暂无文档片段</p>
                {keyword && (
                  <button onClick={handleReset} className="reset-search-button">
                    清除搜索条件
                  </button>
                )}
              </div>
            ) : (
              details.map((detail, index) => (
                <div key={`${detail.file_name}-${index}`} className="detail-item">
                  <div className="detail-header">
                    <h3 className="detail-title">{detail.title}</h3>
                    <div className="detail-meta">
                      <span className="language-tag">{detail.language}</span>
                      <span className="time-info">{formatTime(detail.cut_time)}</span>
                    </div>
                  </div>
                  
                  <div className="detail-content">
                    <div className="content-markdown">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          // 自定义组件样式
                          h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
                          h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
                          h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
                          h4: ({ children }) => <h4 className="markdown-h4">{children}</h4>,
                          p: ({ children }) => <p className="markdown-p">{children}</p>,
                          code: ({ children, className }) => (
                            <code className={`markdown-code ${className || ''}`}>{children}</code>
                          ),
                          pre: ({ children }) => <pre className="markdown-pre">{children}</pre>,
                          blockquote: ({ children }) => <blockquote className="markdown-blockquote">{children}</blockquote>,
                          ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
                          ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
                          li: ({ children }) => <li className="markdown-li">{children}</li>,
                          table: ({ children }) => <table className="markdown-table">{children}</table>,
                          thead: ({ children }) => <thead className="markdown-thead">{children}</thead>,
                          tbody: ({ children }) => <tbody className="markdown-tbody">{children}</tbody>,
                          tr: ({ children }) => <tr className="markdown-tr">{children}</tr>,
                          th: ({ children }) => <th className="markdown-th">{children}</th>,
                          td: ({ children }) => <td className="markdown-td">{children}</td>,
                          a: ({ children, href }) => <a href={href} className="markdown-a" target="_blank" rel="noopener noreferrer">{children}</a>,
                          strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
                          em: ({ children }) => <em className="markdown-em">{children}</em>,
                        }}
                      >
                        {detail.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {detail.operation_procedure_remarks && (
                    <div className="detail-remarks">
                      <h4>操作说明：</h4>
                      <div className="remarks-markdown">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
                            h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
                            h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
                            h4: ({ children }) => <h4 className="markdown-h4">{children}</h4>,
                            p: ({ children }) => <p className="markdown-p">{children}</p>,
                            code: ({ children, className }) => (
                              <code className={`markdown-code ${className || ''}`}>{children}</code>
                            ),
                            pre: ({ children }) => <pre className="markdown-pre">{children}</pre>,
                            blockquote: ({ children }) => <blockquote className="markdown-blockquote">{children}</blockquote>,
                            ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
                            ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
                            li: ({ children }) => <li className="markdown-li">{children}</li>,
                            table: ({ children }) => <table className="markdown-table">{children}</table>,
                            thead: ({ children }) => <thead className="markdown-thead">{children}</thead>,
                            tbody: ({ children }) => <tbody className="markdown-tbody">{children}</tbody>,
                            tr: ({ children }) => <tr className="markdown-tr">{children}</tr>,
                            th: ({ children }) => <th className="markdown-th">{children}</th>,
                            td: ({ children }) => <td className="markdown-td">{children}</td>,
                            a: ({ children, href }) => <a href={href} className="markdown-a" target="_blank" rel="noopener noreferrer">{children}</a>,
                            strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
                            em: ({ children }) => <em className="markdown-em">{children}</em>,
                          }}
                        >
                          {detail.operation_procedure_remarks}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  <div className="detail-footer">
                    <div className="detail-info">
                      <div className="info-row">
                        <span className="info-label">文件名：</span>
                        <span className="info-value">{detail.file_name}</span>
                      </div>
                      {detail.product_name && detail.product_name.length > 0 && (
                        <div className="info-row">
                          <span className="info-label">关联产品：</span>
                          <span className="info-value">
                            {detail.product_name.join(', ')}
                          </span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="info-label">分类：</span>
                        <span className="info-value">
                          {detail.catalog_l1} / {detail.catalog_l2}
                        </span>
                      </div>
                    </div>
                    
                    <div className="detail-actions">
                      <button
                        onClick={() => handleViewDetail(detail.view_url)}
                        className="view-button"
                        disabled={!detail.view_url}
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 分页 */}
        {!loading && !error && totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-controls">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage <= 1}
                className="page-button"
                title="首页"
              >
                ««
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="page-button"
              >
                上一页
              </button>
              
              <div className="page-jump">
                <input
                  type="number"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder="页码"
                  min="1"
                  max={totalPages}
                  className="page-input"
                  onKeyPress={(e) => e.key === 'Enter' && handlePageJump()}
                />
                <button onClick={handlePageJump} className="jump-button">
                  跳转
                </button>
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="page-button"
              >
                下一页
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages}
                className="page-button"
                title="末页"
              >
                »»
              </button>
            </div>
            
            <div className="pagination-info">
              <div className="page-info">
                <span>第 {currentPage} 页，共 {totalPages} 页</span>
                <span className="total-info">（共 {total} 条记录）</span>
              </div>
              
              <div className="page-size-selector">
                <label>每页显示：</label>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                  className="page-size-select"
                  disabled={loading}
                >
                  <option value={5}>5条</option>
                  <option value={10}>10条</option>
                  <option value={20}>20条</option>
                  <option value={50}>50条</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileDetailList;
