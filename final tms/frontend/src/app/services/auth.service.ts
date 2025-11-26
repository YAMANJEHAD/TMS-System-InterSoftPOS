import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';

interface LoginResponse {
  userId?: number;
  UserId?: number;
  name?: string;
  Name?: string;
  email?: string;
  Email?: string;
  roleId?: number;
  RoleId?: number;
  permissions?: string[];
  Permissions?: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = '/api/Auth';
  // BehaviorSubject to hold the current userName, initialized from sessionStorage
  private userNameSubject = new BehaviorSubject<string | null>(sessionStorage.getItem('UserName'));
  // Observable for components to subscribe to userName changes
  userName$ = this.userNameSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    const url = `${this.apiUrl}/login`;
    console.log('AuthService: Attempting login to', url);
    return this.http.post<LoginResponse>(
      url,
      { email, password },
      { withCredentials: true }
    ).pipe(
      tap(response => {
        console.log('AuthService: Login successful, response:', response);
        // store in sessionStorage
        const name = response.name ?? response.Name ?? '';
        sessionStorage.setItem('UserName', name);
        const id = response.userId ?? response.UserId;
        if (id != null) sessionStorage.setItem('UserId', id.toString());
        const perms = response.permissions ?? response.Permissions ?? [];
        console.log('AuthService: Storing permissions:', perms);
        sessionStorage.setItem('Permissions', JSON.stringify(perms));
        console.log('AuthService: Permissions stored in sessionStorage:', sessionStorage.getItem('Permissions'));
        // update the BehaviorSubject so it survives page refresh
        this.userNameSubject.next(name);
      })
    );
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  /**
   * Gets the current userName from BehaviorSubject
   */
  getUserName(): string | null {
    return this.userNameSubject.value;
  }

  /**
   * Gets the current user ID from sessionStorage
   */
  getUserId(): number | null {
    const userIdStr = sessionStorage.getItem('UserId');
    return userIdStr ? parseInt(userIdStr, 10) : null;
  }

  /**
   * Checks if the current user has admin permissions
   * Admin permissions are determined by having admin-level permissions like:
   * - GetUsers, InsertUser, UpdateUser, DeleteUser
   * - AddPermissionToRole, AssignPermissionToUser
   * - ResetUserPassword, SetUserIsActive
   * Or having a permission that contains "admin" (case-insensitive)
   */
  isAdmin(): boolean {
    const permissions = sessionStorage.getItem('Permissions');
    if (!permissions) {
      console.log('AuthService: No Permissions found in sessionStorage');
      return false;
    }
    
    try {
      const perms = JSON.parse(permissions);
      console.log('AuthService: Parsed permissions:', perms);
      
      // Check if permissions is an array
      if (!Array.isArray(perms)) {
        console.log('AuthService: Permissions is not an array:', typeof perms);
        return false;
      }
      
      // Admin-level permissions that indicate admin access
      const adminPermissions = [
        'GetUsers',
        'InsertUser',
        'UpdateUser',
        'DeleteUser',
        'AddPermissionToRole',
        'AssignPermissionToUser',
        'ResetUserPassword',
        'SetUserIsActive'
      ];
      
      // Check for admin-level permissions or permissions containing "admin"
      const isAdmin = perms.some(perm => {
        const permStr = String(perm);
        // Check if it's an admin-level permission
        if (adminPermissions.includes(permStr)) {
          return true;
        }
        // Check if permission name contains "admin" (case-insensitive)
        if (permStr.toLowerCase().includes('admin')) {
          return true;
        }
        return false;
      });
      
      console.log('AuthService: isAdmin result:', isAdmin);
      return isAdmin;
    } catch (error) {
      console.error('AuthService: Error parsing permissions:', error);
      return false;
    }
  }

  /**
   * Gets the current user's permissions
   */
  getPermissions(): string[] {
    const permissions = sessionStorage.getItem('Permissions');
    if (!permissions) {
      return [];
    }
    try {
      const perms = JSON.parse(permissions);
      return Array.isArray(perms) ? perms : [];
    } catch {
      return [];
    }
  }
}
