export interface ProjectReport {
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  onHoldTasks: number;
  underProcessTasks: number;
}

export interface UserReport {
  userId: number;
  inventoryCount: number;
  transferCount: number;
}

export interface ReportResponse {
  projects: ProjectReport[];
  users: UserReport[];
}

// Query Parameters for Reports
export interface ReportQueryParams {
  startDate?: string;
  endDate?: string;
}

