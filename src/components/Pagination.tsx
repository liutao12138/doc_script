import React, { useState, useEffect, useRef } from 'react';
import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  disabled = false
}) => {
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 计算显示范围
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // 处理页面跳转
  const handlePageChange = (page: number) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange(page);
  };

  // 处理每页显示数量变化
  const handlePageSizeChange = (newPageSize: number) => {
    if (disabled) {
      return;
    }
    onPageSizeChange(newPageSize);
    setShowPageSizeDropdown(false);
  };

  // 处理下拉框切换
  const toggleDropdown = () => {
    if (disabled) {
      return;
    }
    setShowPageSizeDropdown(!showPageSizeDropdown);
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPageSizeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 生成页码按钮
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // 总页数少于等于5页，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总页数大于5页，显示省略号
      if (currentPage <= 3) {
        // 当前页在前3页
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // 当前页在后3页
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-container">
      {/* 每页显示数量选择器 */}
      <div className="pagination-page-size">
        <span className="pagination-page-size-label">每页显示</span>
        <div className="pagination-custom-select" ref={dropdownRef}>
          <button
            type="button"
            className="pagination-select-trigger"
            onClick={toggleDropdown}
            aria-expanded={showPageSizeDropdown}
            aria-haspopup="listbox"
          >
            <span className="pagination-select-value">{pageSize}</span>
            <span className={`pagination-select-arrow ${showPageSizeDropdown ? 'active' : ''}`}>
              ▼
            </span>
          </button>
          
          {showPageSizeDropdown && (
            <div className="pagination-select-options" role="listbox">
              {pageSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`pagination-select-option ${size === pageSize ? 'selected' : ''}`}
                  onClick={() => handlePageSizeChange(size)}
                  role="option"
                  aria-selected={size === pageSize}
                >
                  <span className="pagination-select-option-text">{size}</span>
                  {size === pageSize && (
                    <span className="pagination-select-option-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="pagination-page-size-label">条</span>
      </div>

      {/* 分页信息 */}
      <div className="pagination-info">
        共 {totalItems} 条，第 {startItem}-{endItem} 条
      </div>

      {/* 分页控件 */}
      <div className="pagination-controls">
        {/* 上一页按钮 */}
        <button
          type="button"
          className={`pagination-btn pagination-prev ${currentPage === 1 || disabled ? 'disabled' : ''}`}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || disabled}
          aria-label="上一页"
        >
          <span className="pagination-btn-icon">‹</span>
        </button>

        {/* 页码按钮 */}
        <div className="pagination-pages">
          {generatePageNumbers().map((page, index) => (
            <button
              key={index}
              type="button"
              className={`pagination-btn pagination-page ${
                page === currentPage ? 'active' : ''
              } ${page === '...' ? 'ellipsis' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => typeof page === 'number' && handlePageChange(page)}
              disabled={page === '...' || disabled}
              aria-label={page === '...' ? '更多页面' : `第 ${page} 页`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
        </div>

        {/* 下一页按钮 */}
        <button
          type="button"
          className={`pagination-btn pagination-next ${currentPage === totalPages || disabled ? 'disabled' : ''}`}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || disabled}
          aria-label="下一页"
        >
          <span className="pagination-btn-icon">›</span>
        </button>
      </div>

      {/* 跳转到指定页面 */}
      <div className="pagination-jump">
        <span className="pagination-jump-label">跳转到</span>
        <input
          type="number"
          className="pagination-jump-input"
          min="1"
          max={totalPages}
          value=""
          placeholder={currentPage.toString()}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled) {
              const target = e.target as HTMLInputElement;
              const page = parseInt(target.value);
              if (page >= 1 && page <= totalPages) {
                handlePageChange(page);
                target.value = '';
              }
            }
          }}
          aria-label="跳转到指定页面"
        />
        <span className="pagination-jump-label">页</span>
      </div>
    </div>
  );
};

export default Pagination;