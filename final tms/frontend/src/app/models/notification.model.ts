export interface Notification {
  notificationId: number;
  taskId: number;
  userId: number;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

