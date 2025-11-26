// Inventory Request
export interface CreateInventoryRequest {
  terminalNumber: string;
  reasonId: number;
  altTerminalNumber?: string;
  techId: number;
  serialNumber?: string;
  altSerialNumber?: string;
}

// Task Request
export interface TaskQueryParams {
  fromDate?: string;
  toDate?: string;
  title?: string;
  statusId?: number;
  priorityId?: number;
  projectId?: number;
  userId?: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate: string;
  statusId: number;
  priorityId: number;
  projectId: number;
  ids?: string;
  fileName?: string;
  filePath?: string;
}

// Job Order Request
export interface CreateJobOrderRequest {
  dueDate: string;
  title: string;
  description: string;
  ids?: string;
  fileName?: string;
  filePath?: string;
}

// Job Order Query Parameters
export interface JobOrderQueryParams {
  month?: number;
  year?: number;
}

// Transfer Request
export interface CreateTransferRequest {
  terminalNumber: string;
  ticketNo: string;
  rejectReason?: string;
  fromTechId: number;
  toTechId: number;
  statusId?: number;
}

export interface UpdateTransferRequest {
  id: number;
  terminalNumber: string;
  ticketNo: string;
  rejectReason: string;
  fromTechId: number;
  toTechId: number;
  statusId: number;
}

export interface TransferQueryParams {
  fromDate?: string;
  toDate?: string;
  ticketNo?: number;
  duplicateCount?: number;
  terminalNumber?: number;
}

// User Request
export interface CreateUserRequest {
  name: string;
  email: string;
  passwordHash: string;
  roleId: string;
  departmentId: number;
  phone: number;
}

export interface SelfUpdateUserRequest {
  name?: string;
  phone?: number;
  avatar_color?: string;
  theme?: string;
}

export interface AdminUpdateUserRequest {
  name?: string;
  email?: string;
  passwordHash?: string;
  roleId?: string;
  departmentId?: number;
  phone?: number;
}

// Role Permission Request
export interface AddPermissionToRoleRequest {
  roleId: number;
  permissionId: number;
}

export interface AssignPermissionToUserRequest {
  userId: number;
  permissionId: number;
}

// Paper Request
export interface CreatePaperRequest {
  cancelledTerminalNo: string;
  deliveredTerminalNo: string;
  cancelledTicketNo: string;
  deliveredTicketNo: string;
}

export interface UpdatePaperRequest {
  cancelledTerminalNo: string;
  deliveredTerminalNo: string;
  cancelledTicketNo: string;
  deliveredTicketNo: string;
}

// Paper Query Parameters
export interface PaperQueryParams {
  fromDate?: string;
  toDate?: string;
  entryUser?: number;
}

