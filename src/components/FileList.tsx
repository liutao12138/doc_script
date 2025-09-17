import React, { useState, useEffect } from 'react';
import { FileItem, SearchFilters, FileListRequest } from '../types';
import { fetchFileList, checkApiHealth, retryFileProcessing, resetFileStatus, pullData } from '../api';
import ToastContainer, { useToast } from './ToastContainer';
import './FileList.css';

const FileList: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [retryingFiles, setRetryingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [apiStatus, setApiStatus] = useState<string>('检查中...');
  const pageSize = 10;
  
  // Toast 管理
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  // 重置相关状态
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [resetType, setResetType] = useState<'all' | 'single' | null>(null);
  const [resetTargetNid, setResetTargetNid] = useState<string>('');
  
  // 批量重试相关状态
  const [showBatchRetryConfirm, setShowBatchRetryConfirm] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const [filters, setFilters] = useState<SearchFilters>({
    nid: '',
    name: '',
    handle_status: [],
    file_type: []
  });

  // 自定义文件类型相关状态
  const [customFileType, setCustomFileType] = useState<string>('');
  const [customFileTypes, setCustomFileTypes] = useState<string[]>([]);

  // 处理状态选项
  const handleStatusOptions = [
    { value: '0', label: '未处理' },
    { value: '1', label: '处理中' },
    { value: '2', label: '处理完成' },
    { value: '3', label: '处理失败' }
  ];
  const fileTypeOptions = ['PDF', 'DOC', 'DOCX', 'TXT', 'XLS', 'XLSX', 'PNG', 'HDX', 'PPT', 'PPTX'];

  // 状态码转换函数
  const getStatusText = (status: number | string): string => {
    const statusMap: { [key: string]: string } = {
      '0': '未处理',
      '1': '处理中',
      '2': '处理完成',
      '3': '处理失败'
    };
    return statusMap[String(status)] || '未知状态';
  };

  // 时间格式化函数
  const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return '-';
    
    // 判断时间戳是秒还是毫秒
    // 如果时间戳大于 2000-01-01 的毫秒数，则认为是毫秒
    const isMilliseconds = timestamp > 946684800000; // 2000-01-01 00:00:00 UTC 的毫秒数
    
    const date = new Date(isMilliseconds ? timestamp : timestamp * 1000);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '无效时间';
    }
    
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 检查 API 状态
  useEffect(() => {
    const checkStatus = async () => {
      const isHealthy = await checkApiHealth();
      setApiStatus(isHealthy ? '🟢 连接正常' : '🟡 使用打桩数据');
    };
    checkStatus();
  }, []);

  const loadFiles = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        ...filters,
        page,
        page_size: pageSize
      };

      // 过滤空值
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => 
          value !== '' && value !== null && value !== undefined && 
          !(Array.isArray(value) && value.length === 0)
        )
      ) as unknown as FileListRequest;

      const response = await fetchFileList(cleanParams);
      
      // 确保数据是数组
      if (response && Array.isArray(response.data)) {
        setFiles(response.data);
        setTotal(response.total || 0);
        setTotalPages(response.total_pages || 0);
        setCurrentPage(response.page || 1);
      } else {
        console.warn('API 返回的数据格式不正确:', response);
        setFiles([]);
        setTotal(0);
        setTotalPages(0);
        setCurrentPage(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(1);
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    loadFiles(1);
  };

  const handleResetFilters = () => {
    setFilters({
      nid: '',
      name: '',
      handle_status: [],
      file_type: []
    });
    setCustomFileType('');
    setCustomFileTypes([]);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadFiles(page);
  };

  // 智能分页渲染函数
  const renderPaginationPages = () => {
    const maxVisiblePages = 7; // 最多显示7个页码按钮
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxVisiblePages) {
      // 如果总页数不超过最大显示数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 智能分页逻辑
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, currentPage - halfVisible);
      let endPage = Math.min(totalPages, currentPage + halfVisible);
      
      // 调整边界
      if (endPage - startPage + 1 < maxVisiblePages) {
        if (startPage === 1) {
          endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        } else {
          startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
      }
      
      // 添加第一页
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }
      
      // 添加中间页码
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // 添加最后一页
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages.map((page, index) => {
      if (page === '...') {
        return (
          <span key={`ellipsis-${index}`} className="page-ellipsis">
            ...
          </span>
        );
      }
      
      const pageNum = page as number;
      return (
        <button
          key={pageNum}
          onClick={() => handlePageChange(pageNum)}
          className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
        >
          {pageNum}
        </button>
      );
    });
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCheckboxChange = (key: 'handle_status' | 'file_type', value: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: checked 
        ? [...prev[key], value]
        : prev[key].filter(item => item !== value)
    }));
  };

  // 处理自定义文件类型
  const handleAddCustomFileType = () => {
    const trimmedType = customFileType.trim().toUpperCase();
    if (trimmedType && !customFileTypes.includes(trimmedType) && !fileTypeOptions.includes(trimmedType)) {
      setCustomFileTypes(prev => [...prev, trimmedType]);
      setCustomFileType('');
    }
  };

  const handleRemoveCustomFileType = (type: string) => {
    setCustomFileTypes(prev => prev.filter(t => t !== type));
    setFilters(prev => ({
      ...prev,
      file_type: prev.file_type.filter(t => t !== type)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomFileType();
    }
  };

  // 重试函数
  const handleRetry = async (fileId: string) => {
    try {
      // 使用文件级别的loading状态，避免全局loading
      setRetryingFiles(prev => new Set([...prev, fileId]));
      
      // 调用重试API
      const response = await retryFileProcessing({
        nid: [fileId]
      });
      
      // 检查响应是否成功（新API格式没有code字段，直接检查message）
      if (response.message && response.nid_num !== undefined) {
        console.log(`文件 ${fileId} 重试成功`);
        showSuccess('文件重试成功！正在重新处理中...');
      } else {
        throw new Error(response.message || '重试失败');
      }
    } catch (error) {
      console.error('重试失败:', error);
      showError('重试失败，请稍后重试');
    } finally {
      // 移除文件级别的loading状态
      setRetryingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  // 重置函数
  const handleReset = async () => {
    try {
      setLoading(true);
      
      const response = await resetFileStatus({
        nid: resetTargetNid,
        reset_all: resetType === 'all'
      });
      
      if (response.status === '0') {
        // 重新加载数据
        await loadFiles(currentPage);
        
        showSuccess(response.message);
        setShowResetConfirm(false);
        setResetType(null);
        setResetTargetNid('');
      } else {
        throw new Error(response.message || '重置失败');
      }
    } catch (error) {
      console.error('重置失败:', error);
      showError('重置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 打开重置确认对话框
  const openResetConfirm = (type: 'all' | 'single', nid?: string) => {
    setResetType(type);
    setResetTargetNid(nid || '');
    setShowResetConfirm(true);
  };

  // 关闭重置确认对话框
  const closeResetConfirm = () => {
    setShowResetConfirm(false);
    setResetType(null);
    setResetTargetNid('');
  };

  // 批量重试函数 - 根据当前筛选的文件类型
  const handleBatchRetry = async () => {
    try {
      setLoading(true);
      
      // 获取当前筛选的文件类型
      const selectedFileTypes = filters.file_type;
      
      if (selectedFileTypes.length === 0) {
        showError('请先选择要重试的文件类型');
        return;
      }
      
      // 调用重试API - 只传递文件类型，让后端自动筛选
      const response = await retryFileProcessing({
        file_type: selectedFileTypes
      });
      
      // 检查响应是否成功（新API格式没有code字段，直接检查message）
      if (response.message && response.nid_num !== undefined) {
        console.log(`批量重试成功，共重试 ${response.nid_num} 个文件`);
        if (response.nid_num > 0) {
          showSuccess(`批量重试成功！共重试 ${response.nid_num} 个文件，正在重新处理中...`);
        } else {
          showSuccess(`批量重试完成！当前筛选条件下没有需要重试的文件。`);
        }
        
        // 关闭确认对话框
        closeBatchRetryConfirm();
      } else {
        throw new Error(response.message || '批量重试失败');
      }
    } catch (error) {
      console.error('批量重试失败:', error);
      showError('批量重试失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 数据同步处理函数
  const handlePullData = async () => {
    try {
      setLoading(true);
      
      await pullData();
      showSuccess('数据同步成功！');
      
      // 同步完成后重新加载数据
      await loadFiles(currentPage);
    } catch (error) {
      console.error('数据同步失败:', error);
      showError('数据同步失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 打开批量重试确认对话框
  const openBatchRetryConfirm = () => {
    setShowBatchRetryConfirm(true);
  };

  // 关闭批量重试确认对话框
  const closeBatchRetryConfirm = () => {
    setShowBatchRetryConfirm(false);
  };

  // 移动端tooltip处理
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const handleCellClick = (e: React.MouseEvent, content: string) => {
    // 只在移动设备上处理点击显示tooltip
    if (window.innerWidth <= 768) {
      e.preventDefault();
      if (activeTooltip === content) {
        setActiveTooltip(null);
      } else {
        setActiveTooltip(content);
      }
    }
  };

  const handleCellMouseEnter = (content: string) => {
    // 只在桌面设备上处理悬停显示tooltip
    if (window.innerWidth > 768) {
      setActiveTooltip(content);
    }
  };

  const handleCellMouseLeave = () => {
    // 只在桌面设备上处理悬停隐藏tooltip
    if (window.innerWidth > 768) {
      setActiveTooltip(null);
    }
  };


  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* 移动端tooltip显示 */}
      {activeTooltip && window.innerWidth <= 768 && (
        <div className="mobile-tooltip-overlay" onClick={() => setActiveTooltip(null)}>
          <div className="mobile-tooltip-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-tooltip-text">{activeTooltip}</div>
            <button 
              className="mobile-tooltip-close"
              onClick={() => setActiveTooltip(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="file-list-container">
        <div className="file-list-header">
        <h1>文件管理系统</h1>
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '1rem', 
          padding: '0.5rem 1rem', 
          background: 'rgba(255, 255, 255, 0.8)', 
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: '500'
        }}>
          状态: {apiStatus}
        </div>
        <div className="search-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>NID:</label>
              <input
                type="text"
                value={filters.nid}
                onChange={(e) => handleFilterChange('nid', e.target.value)}
                placeholder="输入NID"
              />
            </div>
            <div className="filter-group">
              <label>名称:</label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                placeholder="输入名称"
              />
            </div>
          </div>
          
          <div className="filter-row">
            <div className="filter-group">
              <label>处理状态:</label>
              <div className="checkbox-group">
                {handleStatusOptions.map(option => (
                  <label key={option.value} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.handle_status.includes(option.value)}
                      onChange={(e) => handleCheckboxChange('handle_status', option.value, e.target.checked)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <label>文件类型:</label>
              <div className="checkbox-group">
                {fileTypeOptions.map(option => (
                  <label key={option} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.file_type.includes(option)}
                      onChange={(e) => handleCheckboxChange('file_type', option, e.target.checked)}
                    />
                    {option}
                  </label>
                ))}
                {/* 自定义文件类型 */}
                {customFileTypes.map(type => (
                  <label key={`custom-${type}`} className="checkbox-label custom-file-type">
                    <input
                      type="checkbox"
                      checked={filters.file_type.includes(type)}
                      onChange={(e) => handleCheckboxChange('file_type', type, e.target.checked)}
                    />
                    {type}
                    <button 
                      type="button" 
                      className="remove-custom-type"
                      onClick={() => handleRemoveCustomFileType(type)}
                      title="删除自定义类型"
                    >
                      ×
                    </button>
                  </label>
                ))}
              </div>
              {/* 添加自定义文件类型输入框 */}
              <div className="custom-file-type-input">
                <input
                  type="text"
                  placeholder="输入自定义文件类型 (如: MP4, AVI)"
                  value={customFileType}
                  onChange={(e) => setCustomFileType(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="custom-type-input"
                />
                <button 
                  type="button" 
                  onClick={handleAddCustomFileType}
                  className="add-custom-type-btn"
                  disabled={!customFileType.trim()}
                >
                  添加
                </button>
              </div>
            </div>
          </div>

          <div className="filter-actions">
            <button onClick={handleSearch} className="search-btn" disabled={loading}>
              {loading ? '搜索中...' : '搜索'}
            </button>
            <button onClick={handleResetFilters} className="reset-btn">
              重置筛选
            </button>
            <button 
              onClick={handlePullData} 
              className="pull-data-btn"
              disabled={loading}
              title="同步最新数据"
            >
              {loading ? '同步中...' : '数据同步'}
            </button>
            <button 
              onClick={() => openResetConfirm('all')} 
              className="reset-all-btn"
              disabled={loading}
              title="重置所有文件状态"
            >
              全局重置
            </button>
          </div>
          
          {/* 批量重试区域 */}
          <div className="batch-retry-section">
            <h3>批量重试</h3>
            <div className="batch-retry-controls">
              <div className="batch-retry-group">
                <label>根据已选择的文件类型进行批量重试:</label>
                <button 
                  onClick={openBatchRetryConfirm}
                  className="batch-retry-btn"
                  disabled={filters.file_type.length === 0 || loading}
                >
                  批量重试选中类型
                </button>
                <div className="batch-retry-hint">
                  请先在上方选择要重试的文件类型
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="file-list-content">
        {error && (
          <div className="error-message">
            错误: {error}
          </div>
        )}

        {loading ? (
          <div className="loading">
            <div>正在加载文件列表...</div>
          </div>
        ) : (
          <>
            <div className="file-list-stats">
              <div className="stats-info">
                共找到 {total} 个文件，当前第 {currentPage} / {totalPages} 页
              </div>
              <button 
                onClick={() => loadFiles(currentPage)} 
                className={`refresh-btn ${loading ? 'loading' : ''}`}
                disabled={loading}
                title="刷新当前页面数据"
              >
                <span className="refresh-icon">🔄</span>
                {loading ? '刷新中...' : '刷新'}
              </button>
            </div>
            
            <div className="file-table">
              <table>
                <thead>
                  <tr>
                    <th>NID</th>
                    <th>名称</th>
                    <th>处理状态</th>
                    <th>切片数量</th>
                    <th>文件类型</th>
                    <th>更新时间</th>
                    <th>最后更新时间</th>
                    <th>最新数据处理时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(files) && files.length > 0 ? (
                    files.map((file) => (
                      <tr key={file.id}>
                        <td 
                          title={`NID: ${file.nid}`}
                          onClick={(e) => handleCellClick(e, `NID: ${file.nid}`)}
                          onMouseEnter={() => handleCellMouseEnter(`NID: ${file.nid}`)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          {file.nid}
                        </td>
                        <td 
                          title={`文件名称: ${file.name}`}
                          onClick={(e) => handleCellClick(e, `文件名称: ${file.name}`)}
                          onMouseEnter={() => handleCellMouseEnter(`文件名称: ${file.name}`)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          <a 
                            href={file.view_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="file-name-link"
                            title={`点击查看文件详情: ${file.name}`}
                          >
                            {file.name}
                          </a>
                        </td>
                        <td 
                          title={`处理状态: ${getStatusText(file.handle_status)}`}
                          onClick={(e) => handleCellClick(e, `处理状态: ${getStatusText(file.handle_status)}`)}
                          onMouseEnter={() => handleCellMouseEnter(`处理状态: ${getStatusText(file.handle_status)}`)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          <span className={`status-badge status-${file.handle_status}`}>
                            {getStatusText(file.handle_status)}
                          </span>
                        </td>
                        <td 
                          title={`切片数量: ${file.handle_count || 0}`}
                          onClick={(e) => handleCellClick(e, `切片数量: ${file.handle_count || 0}`)}
                          onMouseEnter={() => handleCellMouseEnter(`切片数量: ${file.handle_count || 0}`)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          <span className="handle-count">
                            {file.handle_count || 0}
                          </span>
                        </td>
                        <td 
                          title={`文件类型: ${Array.isArray(file.file_type) ? file.file_type.join(', ') : file.file_type}`}
                          onClick={(e) => handleCellClick(e, `文件类型: ${Array.isArray(file.file_type) ? file.file_type.join(', ') : file.file_type}`)}
                          onMouseEnter={() => handleCellMouseEnter(`文件类型: ${Array.isArray(file.file_type) ? file.file_type.join(', ') : file.file_type}`)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          {Array.isArray(file.file_type) ? file.file_type.join(', ') : file.file_type}
                        </td>
                        <td 
                          title={`更新时间: ${formatTimestamp(file.update_time)}`}
                          onClick={(e) => handleCellClick(e, `更新时间: ${formatTimestamp(file.update_time)}`)}
                          onMouseEnter={() => handleCellMouseEnter(`更新时间: ${formatTimestamp(file.update_time)}`)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          {formatTimestamp(file.update_time)}
                        </td>
                        <td 
                          title={`上一次更新时间: ${formatTimestamp(file.last_update_time)}`}
                          onClick={(e) => handleCellClick(e, `上一次更新时间: ${formatTimestamp(file.last_update_time)}`)}
                          onMouseEnter={() => handleCellMouseEnter(`上一次更新时间: ${formatTimestamp(file.last_update_time)}`)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          {formatTimestamp(file.last_update_time)}
                        </td>
                        <td 
                          title={`最近处理开始时间: ${formatTimestamp(file.handle_update_time)}`}
                          onClick={(e) => handleCellClick(e, `最近处理开始时间: ${formatTimestamp(file.handle_update_time)}`)}
                          onMouseEnter={() => handleCellMouseEnter(`最近处理开始时间: ${formatTimestamp(file.handle_update_time)}`)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          {formatTimestamp(file.handle_update_time)}
                        </td>
                        <td>
                          <div className="action-buttons">
                            {file.handle_status !== '1' && (
                              <button 
                                className="action-btn retry-btn" 
                                title="重试处理此文件"
                                onClick={() => handleRetry(file.nid)}
                                disabled={retryingFiles.has(file.nid)}
                              >
                                {retryingFiles.has(file.nid) ? '重试中...' : '重试'}
                              </button>
                            )}
                            <button 
                              className="action-btn reset-btn" 
                              title="重置此文件状态"
                              onClick={() => openResetConfirm('single', file.nid)}
                            >
                              重置
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>
                        {loading ? '正在加载...' : '暂无数据'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  上一页
                </button>
                
                {renderPaginationPages()}
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>

    {/* 重置确认对话框 */}
    {showResetConfirm && (
      <div className="modal-overlay" onClick={closeResetConfirm}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>确认重置</h3>
            <button className="modal-close" onClick={closeResetConfirm}>×</button>
          </div>
          <div className="modal-body">
            <p>
              {resetType === 'all' 
                ? '确定要重置所有文件的状态吗？此操作将影响所有文件，请谨慎操作。'
                : `确定要重置文件 ${resetTargetNid} 的状态吗？`
              }
            </p>
            {resetType === 'all' && (
              <div className="warning-message">
                ⚠️ 全局重置将影响所有文件，此操作不可撤销！
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={closeResetConfirm}
              disabled={loading}
            >
              取消
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleReset}
              disabled={loading}
            >
              {loading ? '重置中...' : '确认重置'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 批量重试确认对话框 */}
    {showBatchRetryConfirm && (
      <div className="modal-overlay" onClick={closeBatchRetryConfirm}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>确认批量重试</h3>
            <button className="modal-close" onClick={closeBatchRetryConfirm}>×</button>
          </div>
          <div className="modal-body">
            <p>
              确定要重试所有已选择文件类型的文件吗？
              <br />
              已选择的文件类型：{filters.file_type.join(', ')}
            </p> 
            <div className="warning-message">
              ⚠️ 批量重试将重新处理未处理、正在处理中和失败的文件，已完成的文件将被跳过。
            </div>
          </div>
          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={closeBatchRetryConfirm}
              disabled={loading}
            >
              取消
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleBatchRetry}
              disabled={loading}
            >
              {loading ? '重试中...' : '确认重试'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default FileList;
