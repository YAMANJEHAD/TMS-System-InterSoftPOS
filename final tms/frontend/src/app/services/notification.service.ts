import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = '/api/Notifications';

  constructor(private http: HttpClient) {}

  getNotifications(userId: number): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/${userId}`, { withCredentials: true });
  }

  markAsRead(notificationId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${notificationId}/read`, {}, { withCredentials: true });
  }

  deleteNotification(notificationId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`, { withCredentials: true });
  }

  createNotification(notification: any): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification, { withCredentials: true });
  }

  clearOldNotifications(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/clear-old`, { withCredentials: true });
  }
}

