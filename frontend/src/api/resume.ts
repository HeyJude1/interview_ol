import { request } from './request';
import type { UploadResponse } from '../types/resume';

export const resumeApi = {
  /**
   * 导入候选材料并获取诊断结果
   */
  async uploadAndAnalyze(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return request.upload<UploadResponse>('/api/resumes/upload', formData);
  },

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    return request.get('/api/resumes/health');
  },
};
