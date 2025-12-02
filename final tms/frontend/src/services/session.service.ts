import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { API_CONFIG } from '../config/api.config';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SessionData {
  userId: number;
  name: string;
  email: string;
  roleId: number;
  permissions: string[];
  avatarColor?: string;
  theme?: string;
  phone?: string | number;
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private sessionData: SessionData | null = null;
  private sessionData$ = new BehaviorSubject<SessionData | null>(null);

  // Observable for components to subscribe to session changes
  public sessionDataChanges$: Observable<SessionData | null> = this.sessionData$.asObservable();

  constructor(private httpService: HttpService) {
    this.loadSessionFromStorage();
  }

  private loadSessionFromStorage(): void {
    const userId = localStorage.getItem('userId');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');
    const roleId = localStorage.getItem('roleId');
    const permissions = localStorage.getItem('permissions');
    const avatarColor = localStorage.getItem('avatarColor');
    const theme = localStorage.getItem('theme');
    const phone = localStorage.getItem('phone');

    if (userId && name && email && roleId && permissions) {
      // Normalize empty strings to undefined
      const normalizedAvatarColor = avatarColor && avatarColor.trim() !== '' 
        ? avatarColor 
        : undefined;
      const normalizedTheme = theme && theme.trim() !== '' 
        ? theme 
        : undefined;
      
      this.sessionData = {
        userId: parseInt(userId, 10),
        name: name,
        email: email,
        roleId: parseInt(roleId, 10),
        permissions: JSON.parse(permissions),
        avatarColor: normalizedAvatarColor,
        theme: normalizedTheme,
        phone: phone ? (isNaN(Number(phone)) ? phone : Number(phone)) : undefined,
      };
      this.sessionData$.next(this.sessionData);
    }
  }

  getSessionValue(datatype: 'int' | 'string', key: string): Observable<string> {
    return this.httpService.get<{ value: string }>(
      API_CONFIG.ENDPOINTS.AUTH.SESSION,
      { datatype, key }
    ).pipe(
      map(response => response.value)
    );
  }

  getUserId(): Observable<number> {
    return this.getSessionValue('int', 'UserId').pipe(
      map(value => parseInt(value, 10))
    );
  }

  getPermissions(): string[] {
    return this.sessionData?.permissions || [];
  }

  hasPermission(permission: string): boolean {
    const permissions = this.getPermissions();
    return permissions.includes(permission);
  }

  setSessionData(data: SessionData): void {
    // Normalize empty strings to undefined before storing
    const normalizedData: SessionData = {
      ...data,
      avatarColor: data.avatarColor && data.avatarColor.trim() !== '' 
        ? data.avatarColor 
        : undefined,
      theme: data.theme && data.theme.trim() !== '' 
        ? data.theme 
        : undefined,
    };
    
    this.sessionData = normalizedData;
    localStorage.setItem('userId', normalizedData.userId.toString());
    localStorage.setItem('userName', normalizedData.name);
    localStorage.setItem('userEmail', normalizedData.email);
    localStorage.setItem('roleId', normalizedData.roleId.toString());
    localStorage.setItem('permissions', JSON.stringify(normalizedData.permissions));
    
    // Save optional fields (only if not empty)
    if (normalizedData.avatarColor !== undefined && normalizedData.avatarColor.trim() !== '') {
      localStorage.setItem('avatarColor', normalizedData.avatarColor);
    } else {
      localStorage.removeItem('avatarColor');
    }
    if (normalizedData.theme !== undefined && normalizedData.theme.trim() !== '') {
      localStorage.setItem('theme', normalizedData.theme);
    } else {
      localStorage.removeItem('theme');
    }
    if (normalizedData.phone !== undefined) {
      localStorage.setItem('phone', String(normalizedData.phone));
    } else {
      localStorage.removeItem('phone');
    }
    
    // Emit session data changes so components can react
    this.sessionData$.next(this.sessionData);
  }

  getSessionData(): SessionData | null {
    return this.sessionData;
  }

  clearSession(): void {
    this.sessionData = null;
    localStorage.clear();
    this.sessionData$.next(null);
  }

  isLoggedIn(): boolean {
    return this.sessionData !== null;
  }
}

