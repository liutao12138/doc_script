import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileItem, SearchFilters, FileListRequest, PaginationConfig } from '../types';
import { fetchFileList, checkApiHealth, retryFileProcessing, resetFileStatus, pullData } from '../api';
import ToastContainer, { useToast } from './ToastContainer';
import Pagination from './Pagination';
import { useFileListContext } from '../contexts/FileListContext';
import './FileList.css';

const FileList: React.FC = () => {
  const navigate = useNavigate();
  const { 
    filters, 
    currentPage, 
    pageSize, 
    updateFilters, 
    updateCurrentPage, 
    updatePageSize, 
    resetFilters: contextResetFilters,
    restoreState,
    saveState,
    hasSavedState
  } = useFileListContext();
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [retryingFiles, setRetryingFiles] = useState<Set<string>>(new Set());
  const [resettingFiles, setResettingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [apiStatus, setApiStatus] = useState<string>('检查中...');
  
  // 分页配置
  const paginationConfig: PaginationConfig = {
    pageSize,
    pageSizeOptions: [10, 20, 50, 100],
    showPageSizeSelector: true,
    showPageJump: true,
    showTotalInfo: true,
    maxVisiblePages: 7
  };
  
  // Toast 管理
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  
  // 批量重试相关状态
  const [showBatchRetryConfirm, setShowBatchRetryConfirm] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  // 批量重置相关状态
  const [showSelectedResetConfirm, setShowSelectedResetConfirm] = useState<boolean>(false);
  
  // 表格行勾选相关状态
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [showSelectedRetryConfirm, setShowSelectedRetryConfirm] = useState<boolean>(false);
  


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
        updateCurrentPage(response.page || 1);
      } else {
        console.warn('API 返回的数据格式不正确:', response);
        setFiles([]);
        setTotal(0);
        setTotalPages(0);
        updateCurrentPage(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 使用自定义pageSize加载文件的函数
  const loadFilesWithPageSize = async (page: number = 1, customPageSize: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        ...filters,
        page,
        page_size: customPageSize
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
        updateCurrentPage(response.page || 1);
      } else {
        console.warn('API 返回的数据格式不正确:', response);
        setFiles([]);
        setTotal(0);
        setTotalPages(0);
        updateCurrentPage(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 只有在有保存状态时才恢复
    if (hasSavedState) {
      restoreState();
    }
    loadFiles(1);
  }, [hasSavedState]);


  const handleSearch = () => {
    updateCurrentPage(1);
    loadFiles(1);
  };

  const handleResetFilters = () => {
    contextResetFilters();
    setCustomFileType('');
    setCustomFileTypes([]);
  };

  const handlePageChange = (page: number) => {
    updateCurrentPage(page);
    loadFiles(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    updatePageSize(newPageSize);
    updateCurrentPage(1); // 重置到第一页
    // 使用新的pageSize值调用loadFiles
    loadFilesWithPageSize(1, newPageSize);
  };


  const handleFilterChange = (key: keyof SearchFilters, value: string | string[]) => {
    updateFilters({
      ...filters,
      [key]: value
    });
  };

  const handleCheckboxChange = (key: 'handle_status' | 'file_type', value: string, checked: boolean) => {
    updateFilters({
      ...filters,
      [key]: checked 
        ? [...filters[key], value]
        : filters[key].filter(item => item !== value)
    });
  };

  // 处理自定义文件类型
  const handleAddCustomFileType = () => {
    const trimmedType = customFileType.trim().toUpperCase();
    if (trimmedType && !customFileTypes.includes(trimmedType) && !fileTypeOptions.includes(trimmedType)) {
      const newCustomTypes = [...customFileTypes, trimmedType];
      setCustomFileTypes(newCustomTypes);
      
      // 更新文件类型筛选
      updateFilters({
        ...filters,
        file_type: [...filters.file_type, trimmedType]
      });
      
      setCustomFileType('');
    }
  };

  const handleRemoveCustomFileType = (type: string) => {
    setCustomFileTypes(prev => prev.filter(t => t !== type));
    updateFilters({
      ...filters,
      file_type: filters.file_type.filter(t => t !== type)
    });
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
      
      // 重新加载数据
      await loadFiles(currentPage);
    }
  };

  // 重置文件状态函数
  const handleReset = async (fileId: string) => {
    try {
      // 使用文件级别的loading状态，避免全局loading
      setResettingFiles(prev => new Set([...prev, fileId]));
      
      // 调用重置API
      const response = await resetFileStatus({
        nid: [fileId]
      });
      
      // 检查响应是否成功 - status为"0"表示成功
      if (response.status === "0" && response.message && response.nid_num !== undefined) {
        console.log(`文件 ${fileId} 重置成功`);
        showSuccess('文件状态重置成功！已重置为待处理状态...');
      } else {
        throw new Error(response.message || '重置失败');
      }
    } catch (error) {
      console.error('重置失败:', error);
      showError('重置失败，请稍后重试');
    } finally {
      // 移除文件级别的loading状态
      setResettingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      
      // 重新加载数据
      await loadFiles(currentPage);
    }
  };

  // 跳转到文件详情
  const handleViewDetails = (fileId: string) => {
    // 保存当前状态
    saveState();
    navigate(`/file/${fileId}`);
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



  // 表格行勾选相关函数
  const handleRowCheck = (fileId: string, checked: boolean) => {
    setCheckedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFileIds = files.map(file => file.nid);
      setCheckedRows(new Set(allFileIds));
    } else {
      setCheckedRows(new Set());
    }
  };

  const isAllSelected = () => {
    return files.length > 0 && checkedRows.size === files.length;
  };

  const isIndeterminate = () => {
    return checkedRows.size > 0 && checkedRows.size < files.length;
  };

  // 勾选行重试函数
  const handleSelectedRetry = async () => {
    try {
      setLoading(true);
      
      const selectedNids = Array.from(checkedRows);
      
      if (selectedNids.length === 0) {
        showError('请先选择要重试的文件');
        return;
      }
      
      // 调用重试API
      const response = await retryFileProcessing({
        nid: selectedNids
      });
      
      // 检查响应是否成功
      if (response.message && response.nid_num !== undefined) {
        console.log(`勾选行重试成功，共重试 ${response.nid_num} 个文件`);
        if (response.nid_num > 0) {
          showSuccess(`勾选行重试成功！共重试 ${response.nid_num} 个文件，正在重新处理中...`);
        } else {
          showSuccess(`勾选行重试完成！所选文件中没有需要重试的文件。`);
        }
        
        // 关闭确认对话框并清空勾选
        setShowSelectedRetryConfirm(false);
        setCheckedRows(new Set());
      } else {
        throw new Error(response.message || '勾选行重试失败');
      }
    } catch (error) {
      console.error('勾选行重试失败:', error);
      showError('勾选行重试失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 打开勾选行重试确认对话框
  const openSelectedRetryConfirm = () => {
    if (checkedRows.size === 0) {
      showError('请先选择要重试的文件');
      return;
    }
    setShowSelectedRetryConfirm(true);
  };

  // 关闭勾选行重试确认对话框
  const closeSelectedRetryConfirm = () => {
    setShowSelectedRetryConfirm(false);
  };

  // 勾选行重置函数
  const handleSelectedReset = async () => {
    try {
      setLoading(true);
      
      const selectedNids = Array.from(checkedRows);
      
      if (selectedNids.length === 0) {
        showError('请先选择要重置的文件');
        return;
      }
      
      // 调用重置API，传入选中的文件ID
      const response = await resetFileStatus({
        nid: selectedNids
      });
      
      // 检查响应是否成功 - status为"0"表示成功
      if (response.status === "0" && response.message && response.nid_num !== undefined) {
        console.log(`勾选行重置成功，共重置 ${response.nid_num} 个文件`);
        if (response.nid_num > 0) {
          showSuccess(`勾选行重置成功！共重置 ${response.nid_num} 个文件，已重置为待处理状态...`);
        } else {
          showSuccess(`勾选行重置完成！选中的文件没有需要重置的。`);
        }
        
        // 清空选中状态
        setCheckedRows(new Set());
        
        // 关闭确认对话框
        closeSelectedResetConfirm();
      } else {
        throw new Error(response.message || '勾选行重置失败');
      }
    } catch (error) {
      console.error('勾选行重置失败:', error);
      showError('勾选行重置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 打开勾选行重置确认对话框
  const openSelectedResetConfirm = () => {
    if (checkedRows.size === 0) {
      showError('请先选择要重置的文件');
      return;
    }
    setShowSelectedResetConfirm(true);
  };

  // 关闭勾选行重置确认对话框
  const closeSelectedResetConfirm = () => {
    setShowSelectedResetConfirm(false);
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
          </div>
          
          {/* 批量操作区域 */}
          <div className="batch-operations-section">
            <h3>批量操作</h3>
            <div className="batch-operations-controls">
              <div className="batch-operation-group">
                <label>根据已选择的文件类型进行批量操作:</label>
                <div className="batch-buttons">
                  <button 
                    onClick={openBatchRetryConfirm}
                    className="batch-retry-btn"
                    disabled={filters.file_type.length === 0 || loading}
                  >
                    批量重试选中类型
                  </button>
                </div>
                <div className="batch-operation-hint">
                  请先在上方选择要操作的文件类型
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
                {checkedRows.size > 0 && (
                  <span className="selected-info">
                    已选择 {checkedRows.size} 个文件
                  </span>
                )}
              </div>
              <div className="stats-actions">
                {checkedRows.size > 0 && (
                  <div className="selected-actions">
                    <button 
                      onClick={openSelectedRetryConfirm}
                      className="selected-retry-btn"
                      disabled={loading}
                      title="重试选中的文件"
                    >
                      重试选中文件 ({checkedRows.size})
                    </button>
                    <button 
                      onClick={openSelectedResetConfirm}
                      className="selected-reset-btn"
                      disabled={loading}
                      title="重置选中的文件"
                    >
                      重置选中文件 ({checkedRows.size})
                    </button>
                    <button 
                      onClick={() => setCheckedRows(new Set())}
                      className="clear-selection-btn"
                      title="清空选择"
                    >
                      清空选择
                    </button>
                  </div>
                )}
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
            </div>
            
            <div className="file-table-container">
              <div className="file-table">
                <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={isAllSelected()}
                        ref={(input) => {
                          if (input) input.indeterminate = isIndeterminate();
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        title="全选/取消全选"
                      />
                    </th>
                    <th>NID</th>
                    <th>名称</th>
                    <th>处理状态</th>
                    <th>切片数量</th>
                      <th>文件类型</th>
                      <th>文档状态</th>
                      <th>处理时间(秒)</th>
                      <th>更新时间</th>
                      <th>最新数据处理时间</th>
                      <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(files) && files.length > 0 ? (
                    files.map((file) => (
                      <tr key={file.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checkedRows.has(file.nid)}
                            onChange={(e) => handleRowCheck(file.nid, e.target.checked)}
                            title="选择此行"
                          />
                        </td>
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
                          title={`文档状态: ${file.status === '1' ? '正常' : '过期'}`}
                          onClick={(e) => handleCellClick(e, `文档状态: ${file.status === '1' ? '正常' : '过期'}`)}
                          onMouseEnter={() => handleCellMouseEnter(`文档状态: ${file.status === '1' ? '正常' : '过期'}`)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          <span className={`status-badge ${file.status === '1' ? 'status-normal' : 'status-expired'}`}>
                            {file.status === '1' ? '正常' : '过期'}
                          </span>
                        </td>
                        <td 
                          title={`处理时间: ${file.process_time ? `${file.process_time}秒` : '未处理'}`}
                          onClick={(e) => handleCellClick(e, `处理时间: ${file.process_time ? `${file.process_time}秒` : '未处理'}`)}
                          onMouseEnter={() => handleCellMouseEnter(`处理时间: ${file.process_time ? `${file.process_time}秒` : '未处理'}`)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          {file.process_time ? `${file.process_time}秒` : '-'}
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
                          title={`最近处理开始时间: ${formatTimestamp(file.handle_update_time)}`}
                          onClick={(e) => handleCellClick(e, `最近处理开始时间: ${formatTimestamp(file.handle_update_time)}`)}
                          onMouseEnter={() => handleCellMouseEnter(`最近处理开始时间: ${formatTimestamp(file.handle_update_time)}`)}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          {formatTimestamp(file.handle_update_time)}
                        </td>
                        <td>
                          <div className="action-buttons">
                            {/* 主要操作按钮 - 始终显示 */}
                            <button 
                              className="action-btn detail-btn" 
                              title="查看文件详情"
                              onClick={() => handleViewDetails(file.nid)}
                            >
                              详情
                            </button>
                            
                            {/* 重试按钮 - 根据状态决定是否显示 */}
                            {file.handle_status !== '1' && (
                              <button 
                                className="action-btn retry-btn"
                                title="重试处理"
                                onClick={() => handleRetry(file.nid)}
                                disabled={retryingFiles.has(file.nid)}
                              >
                                {retryingFiles.has(file.nid) ? '重试中...' : '重试'}
                              </button>
                            )}
                            
                            {/* 重置按钮 - 根据状态决定是否显示 */}
                            {file.handle_status !== '0' && (
                              <button 
                                className="action-btn reset-btn"
                                title="重置文件状态"
                                onClick={() => handleReset(file.nid)}
                                disabled={resettingFiles.has(file.nid)}
                              >
                                {resettingFiles.has(file.nid) ? '重置中...' : '重置'}
                              </button>
                            )}
                            
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '2rem' }}>
                        {loading ? '正在加载...' : '暂无数据'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              pageSizeOptions={paginationConfig.pageSizeOptions}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>
    </div>


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


    {/* 勾选行重试确认对话框 */}
    {showSelectedRetryConfirm && (
      <div className="modal-overlay" onClick={closeSelectedRetryConfirm}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>确认勾选行重试</h3>
            <button className="modal-close" onClick={closeSelectedRetryConfirm}>×</button>
          </div>
          <div className="modal-body">
            <p>
              确定要重试选中的 {checkedRows.size} 个文件吗？
            </p>
            <div className="warning-message">
              ⚠️ 勾选行重试将重新处理选中的文件，已完成的文件将被跳过。
            </div>
          </div>
          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={closeSelectedRetryConfirm}
              disabled={loading}
            >
              取消
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSelectedRetry}
              disabled={loading}
            >
              {loading ? '重试中...' : '确认重试'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 勾选行重置确认对话框 */}
    {showSelectedResetConfirm && (
      <div className="modal-overlay" onClick={closeSelectedResetConfirm}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>确认勾选行重置</h3>
            <button className="modal-close" onClick={closeSelectedResetConfirm}>×</button>
          </div>
          <div className="modal-body">
            <p>
              确定要重置选中的 {checkedRows.size} 个文件吗？
            </p>
            <div className="warning-message">
              ⚠️ 勾选行重置将把所有选中的文件状态重置为待处理状态，请谨慎操作。
            </div>
          </div>
          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={closeSelectedResetConfirm}
              disabled={loading}
            >
              取消
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSelectedReset}
              disabled={loading}
            >
              {loading ? '重置中...' : '确认重置'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default FileList;
