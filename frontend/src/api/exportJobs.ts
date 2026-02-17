import apiClient from './client';

export interface ExportJobStatus {
  id: string;
  jobType: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  resultUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export async function enqueueDepListExport(departmentListId: string): Promise<{ jobId: string }> {
  const res = await apiClient.post('/api/export/department-list/word', { departmentListId });
  return res.data;
}

export async function getExportJobStatus(jobId: string): Promise<ExportJobStatus> {
  const res = await apiClient.get(`/api/export/jobs/${jobId}`);
  return res.data;
}

export async function getMyExportJobs(): Promise<ExportJobStatus[]> {
  const res = await apiClient.get('/api/export/jobs');
  return res.data;
}
