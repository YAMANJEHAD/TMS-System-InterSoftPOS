import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserColorService } from '../../../services/user-color.service';
import { UserAvatarUtil } from '../../../utils/user-avatar.util';

/**
 * Avatar Component
 * Displays user avatar with color from UserColorService
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="avatar" 
      [style.background-color]="color"
      [title]="name || ''"
    >
      {{ initials }}
    </div>
  `,
  styles: [`
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      transition: background-color 0.3s ease;
    }
  `]
})
export class AvatarComponent implements OnInit {
  @Input() userId?: number;
  @Input() userName?: string;
  @Input() name?: string;
  
  color = '#0A1A3A';
  initials = '';

  constructor(private userColorService: UserColorService) {}

  ngOnInit(): void {
    // Determine which identifier to use
    const id = this.userId;
    
    if (id !== undefined) {
      // Get color from service (non-reactive, fixed)
      this.color = this.userColorService.getColor(id);
      
      // Get initials from name or userName
      const displayName = this.name || this.userName || '';
      this.initials = UserAvatarUtil.getInitials(displayName);
    } else {
      // Fallback: use default color if no userId provided
      this.color = '#0A1A3A';
      this.initials = '?';
    }
  }
}

