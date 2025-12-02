import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { SessionService, SessionData } from './session.service';
import { API_CONFIG } from '../config/api.config';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
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
export class AuthService {
  constructor(
    private httpService: HttpService,
    private sessionService: SessionService
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.httpService.post<LoginResponse>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      credentials
    ).pipe(
      tap(response => {
        // Normalize empty strings to undefined for optional fields
        const normalizedAvatarColor = response.avatarColor && response.avatarColor.trim() !== '' 
          ? response.avatarColor 
          : undefined;
        const normalizedTheme = response.theme && response.theme.trim() !== '' 
          ? response.theme 
          : undefined;
        
        const sessionData: SessionData = {
          userId: response.userId,
          name: response.name,
          email: response.email,
          roleId: response.roleId,
          permissions: response.permissions,
          avatarColor: normalizedAvatarColor,
          theme: normalizedTheme,
          phone: response.phone,
        };
        this.sessionService.setSessionData(sessionData);
        // Theme will be loaded by app.ts via sessionDataChanges$ subscription
      })
    );
  }

  logout(): void {
    this.sessionService.clearSession();
  }
}

