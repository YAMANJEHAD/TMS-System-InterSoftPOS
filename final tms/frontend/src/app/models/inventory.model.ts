export interface Inventory {
  terminalId: number;
  terminalNumber: string;
  entryDate: string;
  altTerminalNumber?: string;
  serialNumber?: string;
  altSerialNumber?: string;
  rejectReason?: string;
  techName: string;
  statusName: string;
  userName: string;
  reasonName?: string;
}

// Chart data structure from /api/Inventory/chart
export interface InventoryChartData {
  count: number;
  entryDate?: string | null;
  userId?: number | null;
  techId?: number | null;
  techName?: string | null;
  reasonName?: string | null;
  statusName?: string | null;
  category?: string | null;
  location?: string | null;
  inStock?: number | null;
  lowStock?: number | null;
  outOfStock?: number | null;
  inbound?: number | null;
  outbound?: number | null;
}

