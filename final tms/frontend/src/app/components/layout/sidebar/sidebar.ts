import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { SessionService } from '../../../../services/session.service';
import { SidebarService } from '../../../../services/sidebar.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  userName = '';
  permissions: string[] = [];
  roleId: number | null = null;
  expandedGroups: { [key: string]: boolean } = {
    transfer: false,
    inventory: false
  };
  private routerSubscription?: Subscription;
  private sidebarSubscription?: Subscription;

  constructor(
    private sessionService: SessionService,
    private router: Router,
    private sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    const sessionData = this.sessionService.getSessionData();
    if (sessionData) {
      this.userName = sessionData.name;
      this.permissions = sessionData.permissions;
      this.roleId = sessionData.roleId;
    }

    // Subscribe to sidebar state changes
    this.isCollapsed = this.sidebarService.getIsCollapsed();
    this.updateBodyClass();
    
    this.sidebarSubscription = this.sidebarService.isCollapsed$.subscribe(collapsed => {
      this.isCollapsed = collapsed;
      this.updateBodyClass();
      // Close expanded groups when collapsing
      if (collapsed) {
        this.expandedGroups['transfer'] = false;
        this.expandedGroups['inventory'] = false;
    }
    });

    // Auto-expand groups when navigating to their sub-pages
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        if (url.includes('/transfer')) {
          this.expandedGroups['transfer'] = true;
          this.expandedGroups['inventory'] = false;
        } else if (url.includes('/inventory')) {
          this.expandedGroups['inventory'] = true;
          this.expandedGroups['transfer'] = false;
        }
      });
  }

  updateBodyClass(): void {
    if (this.isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.sidebarSubscription) {
      this.sidebarSubscription.unsubscribe();
    }
  }

  toggleGroup(groupName: string, event?: Event): void {
    // Always prevent navigation for main menu items with submenus
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const wasExpanded = this.expandedGroups[groupName];
    
    // Close all other groups first (only one submenu open at a time)
    Object.keys(this.expandedGroups).forEach(key => {
      this.expandedGroups[key] = false;
    });
    
    // Toggle the clicked group (open if it was closed, close if it was open)
    this.expandedGroups[groupName] = !wasExpanded;
  }

  closeGroup(groupName: string): void {
    this.expandedGroups[groupName] = false;
  }

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  /**
   * Check if user can access User Management
   * Users with role ID 2 should not see User Management
   */
  canAccessUserManagement(): boolean {
    // Must have GetUsers permission AND not be role ID 2
    return this.hasPermission('GetUsers') && this.roleId !== 2;
  }

  isGroupExpanded(groupName: string): boolean {
    return this.expandedGroups[groupName] || false;
  }

  isAnyTransferPageActive(): boolean {
    const url = this.router.url;
    return url.includes('/transfer');
  }

  isAnyInventoryPageActive(): boolean {
    const url = this.router.url;
    return url.includes('/inventory');
  }
}
