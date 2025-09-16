// API调用相关函数

import { FileListRequest, FileListResponse } from './types';

// 根据环境自动选择API地址
const getApiBaseUrl = () => {
  // 开发环境：使用代理，直接使用相对路径
  if (process.env.NODE_ENV === 'development') {
    return '/api';
  }
  
  // 生产环境：使用环境变量或默认值
  return process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

// 健康检查
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.warn('API health check failed:', error);
    return false;
  }
};

export const fetchFileList = async (params: FileListRequest): Promise<FileListResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/doc/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // 检查返回的数据结构
    if (data.code === 200 && data.data) {
      return {
        data: data.data,
        total: data.total,
        page: data.page,
        page_size: data.page_size,
        total_pages: data.total_pages
      };
    }
    
    // 如果数据结构不符合预期，抛出错误
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error fetching file list:', error);
    throw error;
  }
};

// 状态转换接口
export interface StatusUpdateRequest {
  id: number;
  status: number;
  remark?: string;
}

export interface StatusUpdateResponse {
  code: number;
  message: string;
  data: {
    id: number;
    old_status: number;
    new_status: number;
    handle_time: string;
    handle_user: string;
  } | null;
}

// 重试文件处理
export interface RetryRequest {
  nid?: string[]; // 可选的nid数组，当有文件类型筛选时不需要
  file_type?: string[]; // 可选的文件类型筛选
}

export interface RetryResponse {
  message: string;
  nid_num: number;
}

export const retryFileProcessing = async (params: RetryRequest): Promise<RetryResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error retrying file processing:', error);
    throw error;
  }
};

// 重置文件状态
export interface ResetRequest {
  nid: string;
  reset_all: boolean;
}

export interface ResetResponse {
  message: string;
  status: string;
}

export const resetFileStatus = async (params: ResetRequest): Promise<ResetResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/doc/reset/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error resetting file status:', error);
    throw error;
  }
};

// 数据同步
export const pullData = async (): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/doc/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 无返回参数，直接返回
    return;
  } catch (error) {
    console.error('Error pulling data:', error);
    throw error;
  }
};

// 更新时间接口
export interface UpdateTimeRequest {
  nid: string;
  update_time?: number;
  last_update_time?: number;
}

export interface UpdateTimeResponse {
  code: number;
  message: string;
  data: {
    nid: string;
    old_update_time?: number;
    new_update_time?: number;
    old_last_update_time?: number;
    new_last_update_time?: number;
    update_time: string;
  } | null;
}

export const handleUpdateTime = async (params: UpdateTimeRequest): Promise<UpdateTimeResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/doc/update/time`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating time:', error);
    throw error;
  }
};
