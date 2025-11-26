export interface JobOrder {
  taskId: number;
  fullTitle: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
  userName: string;
  statusName: string;
  projectName: string;
  fileName?: string;
  filePath?: string;
}

