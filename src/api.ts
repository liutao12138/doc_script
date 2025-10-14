// API调用相关函数

import { FileListRequest, FileListResponse, FileDetailRequest, FileDetailResponse } from './types';

// 直接使用相对路径，通过代理处理
const getApiBaseUrl = () => {
  return '/api';
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
    
    // 适配后端接口格式 {data:[], total:20}
    if (data.data && typeof data.total === 'number') {
      return {
        data: data.data,
        total: data.total,
        page: params.page || 1,
        page_size: params.page_size || 10,
        total_pages: Math.ceil(data.total / (params.page_size || 10))
      };
    }
    
    // 兼容原有的格式 {code: 200, message: 'success', data: [], total: 20}
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
    
    // 适配后端接口格式，确保返回正确的结构
    if (data.message && typeof data.nid_num === 'number') {
      return {
        message: data.message,
        nid_num: data.nid_num
      };
    }
    
    // 如果数据结构不符合预期，抛出错误
    throw new Error('Invalid response format for retry');
  } catch (error) {
    console.error('Error retrying file processing:', error);
    throw error;
  }
};

// 重置文件状态接口
export interface ResetRequest {
  nid: string[];
}

export interface ResetResponse {
  message: string;
  nid_num: number;
}

export const resetFileStatus = async (params: ResetRequest): Promise<ResetResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/reset`, {
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
    
    // 适配后端接口格式，确保返回正确的结构
    if (data.message && typeof data.nid_num === 'number') {
      return {
        message: data.message,
        nid_num: data.nid_num
      };
    }
    
    // 如果数据结构不符合预期，抛出错误
    throw new Error('Invalid response format for reset');
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
    old_update_time?: number; // 时间戳
    new_update_time?: number; // 时间戳
    old_last_update_time?: number; // 时间戳
    new_last_update_time?: number; // 时间戳
    update_time: number; // 时间戳
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
    
    // 适配后端接口格式，确保返回正确的结构
    if (data.code && data.message) {
      return {
        code: data.code,
        message: data.message,
        data: data.data
      };
    }
    
    // 如果数据结构不符合预期，抛出错误
    throw new Error('Invalid response format for update time');
  } catch (error) {
    console.error('Error updating time:', error);
    throw error;
  }
};

// 文件详情片段查询
export const fetchFileDetails = async (params: FileDetailRequest): Promise<FileDetailResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/doc/detail/list`, {
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
    
    // 适配后端接口格式，确保返回正确的结构
    if (data.data && typeof data.total === 'number') {
      return {
        data: data.data,
        total: data.total
      };
    }
    
    // 如果数据结构不符合预期，抛出错误
    throw new Error('Invalid response format for file details');
  } catch (error) {
    console.error('Error fetching file details:', error);
    throw error;
  }
};
