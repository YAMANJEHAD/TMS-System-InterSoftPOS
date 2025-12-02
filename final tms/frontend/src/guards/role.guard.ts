import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SessionService } from '../services/session.service';

/**
 * Route guard to prevent users with specific role IDs from accessing routes
 * @param blockedRoleIds Array of role IDs that should be blocked
 * @returns CanActivateFn
 */
export const roleGuard = (blockedRoleIds: number[]): CanActivateFn => {
  return () => {
    const sessionService = inject(SessionService);
    const router = inject(Router);
    
    const sessionData = sessionService.getSessionData();
    
    // If not logged in, redirect to login
    if (!sessionData) {
      router.navigate(['/login']);
      return false;
    }
    
    // If user has a blocked role ID, redirect to dashboard
    if (blockedRoleIds.includes(sessionData.roleId)) {
      router.navigate(['/dashboard']);
      return false;
    }
    
    return true;
  };
};

