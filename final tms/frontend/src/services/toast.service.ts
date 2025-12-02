import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private messages$ = new BehaviorSubject<ToastMessage[]>([]);
  private messageIdCounter = 0;

  getMessages(): Observable<ToastMessage[]> {
    return this.messages$.asObservable();
  }

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000): void {
    const toast: ToastMessage = {
      id: this.messageIdCounter++,
      message,
      type,
      duration: duration || 3000 // Default to 3 seconds if not specified
    };

    const currentMessages = this.messages$.value;
    this.messages$.next([...currentMessages, toast]);

    // Auto-remove after duration (always auto-dismiss, no click required)
    const toastDuration = toast.duration ?? 3000; // Default to 3 seconds if undefined
    if (toastDuration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, toastDuration);
    }
  }

  success(message: string, duration: number = 3000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 5000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration: number = 3000): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration: number = 4000): void {
    this.show(message, 'warning', duration);
  }

  remove(id: number): void {
    const currentMessages = this.messages$.value;
    this.messages$.next(currentMessages.filter(msg => msg.id !== id));
  }

  clear(): void {
    this.messages$.next([]);
  }
}

