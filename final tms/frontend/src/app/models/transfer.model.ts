export interface Transfer {
  id: number;
  terminalNumber: string;
  createdAt: string;
  userName: string;
  ticketNo: string;
  rejectReason?: string;
  fromTech: string;
  toTech: string;
  fromTechId?: number;
  toTechId?: number;
  statusName: string;
  statusId?: number;
  duplicateCount?: number;
}

export interface TransferChartData {
  byUserDay: Array<{
    day: string;
    user_Id: number;
    count: number;
  }>;
  byUserTotal: Array<{
    user_Id: number;
    count: number;
  }>;
  byDayTotal: Array<{
    day: string;
    total_Count: number;
  }>;
}

export interface TransferChartResponse {
  message: string;
  data: TransferChartData;
}

