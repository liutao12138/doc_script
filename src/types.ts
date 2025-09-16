// 文件列表相关的类型定义

export interface FileItem {
  id: string;
  nid: string;
  name: string;
  file_name: string;
  handle_status: string;
  file_type: string[];
  view_url?: string;
  created_at?: number; // 时间戳
  updated_at?: number; // 时间戳
  upload_time?: number; // 时间戳
  handle_time?: number; // 时间戳
  update_time?: number; // 时间戳
  last_update_time?: number; // 时间戳
  handle_update_time?: number; // 时间戳
}

export interface FileListRequest {
  nid?: string;
  name?: string;
  file_name?: string;
  handle_status?: string[];
  file_type?: string[];
  page: number;
  page_size: number;
}

export interface FileListResponse {
  data: FileItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SearchFilters {
  nid: string;
  name: string;
  file_name: string;
  handle_status: string[];
  file_type: string[];
}
