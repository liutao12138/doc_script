// 文件列表相关的类型定义

export interface FileItem {
  id: string;
  nid: string;
  name: string;
  file_name: string;
  handle_status: string;
  file_type: string[];
  handle_count: number; // 文件切片数量
  view_url?: string;
  created_at?: number; // 时间戳
  updated_at?: number; // 时间戳
  upload_time?: number; // 时间戳
  update_time?: number; // 时间戳
  handle_update_time?: number; // 时间戳
  status?: string; // 文档是否过滤，'0'表示过期，'1'表示正常
  process_time?: number | null; // 处理文档时间，单位为秒，默认为空
}

export interface FileListRequest {
  nid?: string;
  name?: string;
  handle_status?: string[];
  file_type?: string[];
  page: number;
  page_size: number;
}

export interface PaginationConfig {
  pageSize: number;
  pageSizeOptions: number[];
  showPageSizeSelector: boolean;
  showPageJump: boolean;
  showTotalInfo: boolean;
  maxVisiblePages: number;
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
  handle_status: string[];
  file_type: string[];
}

// 文件详情片段相关的类型定义
export interface FileDetailItem {
  file_name: string;
  language: string;
  title: string;
  product_name: string[];
  content: string;
  view_url: string;
  operation_procedure_remarks: string;
  cut_time: number;
  catalog_l1: string;
  catalog_l2: string;
}

export interface FileDetailRequest {
  nid: string;
  keyword?: string;
  page?: number;
  page_size?: number;
}

export interface FileDetailResponse {
  data: FileDetailItem[];
  total: number;
}