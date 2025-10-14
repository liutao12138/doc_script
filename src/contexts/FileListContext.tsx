import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SearchFilters } from '../types';

interface FileListContextType {
  // 搜索条件状态
  filters: SearchFilters;
  currentPage: number;
  pageSize: number;
  
  // 更新搜索条件的方法
  updateFilters: (filters: SearchFilters) => void;
  updateCurrentPage: (page: number) => void;
  updatePageSize: (size: number) => void;
  
  // 重置搜索条件
  resetFilters: () => void;
  
  // 保存和恢复状态
  saveState: () => void;
  restoreState: () => void;
  hasSavedState: boolean;
}

const FileListContext = createContext<FileListContextType | undefined>(undefined);

interface FileListProviderProps {
  children: ReactNode;
}

export const FileListProvider: React.FC<FileListProviderProps> = ({ children }) => {
  const [filters, setFilters] = useState<SearchFilters>({
    nid: '',
    name: '',
    handle_status: [],
    file_type: []
  });
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  
  // 保存的状态（用于恢复）
  const [savedState, setSavedState] = useState<{
    filters: SearchFilters;
    currentPage: number;
    pageSize: number;
  } | null>(null);

  const updateFilters = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const updateCurrentPage = (page: number) => {
    setCurrentPage(page);
  };

  const updatePageSize = (size: number) => {
    setPageSize(size);
  };

  const resetFilters = () => {
    setFilters({
      nid: '',
      name: '',
      handle_status: [],
      file_type: []
    });
    setCurrentPage(1);
  };

  const saveState = () => {
    setSavedState({
      filters: { ...filters },
      currentPage,
      pageSize
    });
  };

  const restoreState = () => {
    if (savedState) {
      setFilters({ ...savedState.filters });
      setCurrentPage(savedState.currentPage);
      setPageSize(savedState.pageSize);
      // 清除保存的状态，避免重复恢复
      setSavedState(null);
    }
  };

  const value: FileListContextType = {
    filters,
    currentPage,
    pageSize,
    updateFilters,
    updateCurrentPage,
    updatePageSize,
    resetFilters,
    saveState,
    restoreState,
    hasSavedState: savedState !== null
  };

  return (
    <FileListContext.Provider value={value}>
      {children}
    </FileListContext.Provider>
  );
};

export const useFileListContext = () => {
  const context = useContext(FileListContext);
  if (context === undefined) {
    throw new Error('useFileListContext must be used within a FileListProvider');
  }
  return context;
};
