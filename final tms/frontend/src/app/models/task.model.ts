export interface Task {
  taskId: number;
  title: string;
  dueDate: string;
  statusName: string;
  priorityName: string;
  projectName: string;
  entryUser: string;
  assignBy?: string;
  assignById?: number;
  description?: string;
  createdAt?: string;
  userName?: string;
  fileName?: string;
  filePath?: string;
  updatedAt?: string;
  updatedUser?: string;
}

