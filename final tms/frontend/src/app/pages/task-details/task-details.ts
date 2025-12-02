import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { ToastService } from '../../../services/toast.service';
import { API_CONFIG } from '../../../config/api.config';
import { FileUtil } from '../../../utils/file.util';
import { DateUtil } from '../../../utils/date.util';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface TaskDetails {
  taskId: number;
  title: string;
  description: string;
  dueDate: string;
  statusName: string;
  priorityName: string;
  projectName: string;
  entryUser: string;
  assignBy: string;
  fileName: string;
  filePath: string;
  createdAt: string;
  updatedAt: string;
  updatedUser: string;
}

interface Priority {
  priorityId: number;
  priorityName: string;
}

interface Project {
  projectId: number;
  name: string;
}

interface Status {
  statusId: number;
  statusName: string;
}

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, BreadcrumbComponent],
  templateUrl: './task-details.html',
  styleUrl: './task-details.scss'
})
export class TaskDetailsComponent implements OnInit {
  taskId: number = 0;
  task: TaskDetails | null = null;
  isLoading = false;
  showEditModal = false;
  errorMessage = '';
  
  // Form fields
  title = '';
  description = '';
  dueDate = '';
  statusId = 0;
  priorityId = 0;
  projectId = 0;
  selectedFile: File | null = null;
  fileName = '';
  fileBase64String = '';
  
  // Filter options
  priorities: Priority[] = [];
  projects: Project[] = [];
  statuses: Status[] = [];
  
  // File display
  existingFileName = '';
  existingFilePath = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private httpService: HttpService,
    public sessionService: SessionService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.taskId = parseInt(id, 10);
      this.loadTaskDetails();
      this.loadFilters();
    }
  }

  loadTaskDetails(): void {
    this.isLoading = true;
    this.httpService.get<TaskDetails>(API_CONFIG.ENDPOINTS.TASKS.GET_BY_ID(this.taskId)).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.task = { ...data };
        this.title = data.title;
        this.description = data.description || '';
        this.dueDate = DateUtil.toISOString(new Date(data.dueDate));
        this.existingFileName = data.fileName || '';
        this.existingFilePath = data.filePath || '';
        this.isLoading = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        this.errorMessage = 'Failed to load task details';
        this.isLoading = false;
        console.error('Error loading task:', error);
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  loadFilters(): void {
    this.httpService.get<Priority[]>(API_CONFIG.ENDPOINTS.FILTERS.PRIORITIES).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.priorities = [...data];
        if (this.task) {
          const priority = data.find(p => p.priorityName === this.task!.priorityName);
          if (priority) this.priorityId = priority.priorityId;
        }
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
    this.httpService.get<Project[]>(API_CONFIG.ENDPOINTS.FILTERS.PROJECTS).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.projects = [...data];
        if (this.task) {
          const project = data.find(p => p.name === this.task!.projectName);
          if (project) this.projectId = project.projectId;
        }
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
    this.httpService.get<Status[]>(API_CONFIG.ENDPOINTS.FILTERS.STATUSES).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
        this.statuses = [...data];
        if (this.task) {
          const status = data.find(s => s.statusName === this.task!.statusName);
          if (status) this.statusId = status.statusId;
        }
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      this.fileName = this.selectedFile.name;
      FileUtil.fileToBase64(this.selectedFile).then(base64 => {
        this.fileBase64String = base64;
      });
    }
  }

  openEditModal(): void {
    if (this.task) {
      // Load current values into form
      this.title = this.task.title;
      this.description = this.task.description || '';
      this.dueDate = DateUtil.toISOString(new Date(this.task.dueDate));
      this.selectedFile = null;
      this.fileName = '';
      this.fileBase64String = '';
      
      // Set IDs from current task values
      const priority = this.priorities.find(p => p.priorityName === this.task!.priorityName);
      if (priority) this.priorityId = priority.priorityId;
      
      const project = this.projects.find(p => p.name === this.task!.projectName);
      if (project) this.projectId = project.projectId;
      
      const status = this.statuses.find(s => s.statusName === this.task!.statusName);
      if (status) this.statusId = status.statusId;
      
      this.ngZone.run(() => {
        this.showEditModal = true;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      });
    }
  }

  closeEditModal(): void {
    this.ngZone.run(() => {
      this.showEditModal = false;
      this.errorMessage = '';
      this.selectedFile = null;
      this.fileName = '';
      this.fileBase64String = '';
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  updateTask(): void {
    if (!this.title || !this.dueDate) {
      this.errorMessage = 'Title and Due Date are required';
      return;
    }

    this.isLoading = true;
    const updateData: any = {
      taskId: this.taskId,
      title: this.title,
      description: this.description,
      dueDate: this.dueDate,
      statusId: this.statusId,
      priorityId: this.priorityId,
      projectId: this.projectId,
      ids: ''
    };

    if (this.fileBase64String && this.fileName) {
      updateData.fileName = this.fileName;
      updateData.fileBase64String = this.fileBase64String;
    }

    this.httpService.put(API_CONFIG.ENDPOINTS.TASKS.UPDATE(this.taskId), updateData).subscribe({
      next: () => {
        this.ngZone.run(() => {
        this.isLoading = false;
          this.showEditModal = false;
        this.toastService.success('Task updated successfully');
        this.loadTaskDetails();
        this.errorMessage = '';
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        this.errorMessage = 'Failed to update task';
        this.toastService.error('Failed to update task');
        this.isLoading = false;
        console.error('Error updating task:', error);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/all-tasks']);
  }

  downloadFile(): void {
    if (!this.existingFilePath || !this.existingFileName) {
      this.toastService.warning('File path or name is missing');
      return;
    }

    // Extract filename from path (handle both Windows paths and web paths)
    let fileName = this.existingFileName;
    let webPath = this.existingFilePath;

    // If filePath is a Windows absolute path (contains backslashes or drive letter)
    if (this.existingFilePath.includes('\\') || this.existingFilePath.match(/^[A-Z]:/)) {
      // Extract just the filename from the full path
      const pathParts = this.existingFilePath.replace(/\\/g, '/').split('/');
      const extractedFileName = pathParts[pathParts.length - 1] || this.existingFileName;
      fileName = extractedFileName;
      
      // Try to determine the web path based on the folder structure
      // Check if path contains 'uploaded_files' or 'Files'
      if (this.existingFilePath.toLowerCase().includes('uploaded_files')) {
        // URL encode the filename but keep the path structure
        const encodedFileName = encodeURIComponent(extractedFileName);
        webPath = `/uploaded_files/${encodedFileName}`;
      } else {
        const encodedFileName = encodeURIComponent(extractedFileName);
        webPath = `/Files/${encodedFileName}`;
      }
    } else if (!this.existingFilePath.startsWith('/')) {
      // If it's a relative path without leading slash, add /Files/
      const encodedPath = encodeURIComponent(this.existingFilePath);
      webPath = `/Files/${encodedPath}`;
    } else {
      // If it's already a web path, encode the filename part
      const pathParts = webPath.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart) {
        pathParts[pathParts.length - 1] = encodeURIComponent(lastPart);
        webPath = pathParts.join('/');
      }
    }

    // Build the full URL - encode the entire path properly
    const fileUrl = `${API_CONFIG.BASE_URL}${webPath}`;
    console.log('Downloading file:', {
      originalPath: this.existingFilePath,
      fileName: fileName,
      webPath: webPath,
      fullUrl: fileUrl
    });
    
    // Use HttpClient to download with authentication
    this.http.get(fileUrl, {
      responseType: 'blob',
      withCredentials: true, // Include session cookies
      observe: 'response'
    }).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.toastService.error('File download failed: Empty response');
          return;
        }

        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        this.toastService.success('File downloaded successfully');
      },
      error: (error) => {
        console.error('Error downloading file:', error);
        console.error('Attempted URL:', fileUrl);
        
        // Try alternative approaches
        this.tryAlternativeDownloadPaths(fileName, this.existingFilePath);
      }
    });
  }

  private tryAlternativeDownloadPaths(fileName: string, originalPath: string): void {
    const alternatives: string[] = [];
    
    // Try different path variations
    if (originalPath.toLowerCase().includes('uploaded_files')) {
      // Try with just the filename (no encoding)
      alternatives.push(`/uploaded_files/${fileName}`);
      // Try with Files folder
      alternatives.push(`/Files/${fileName}`);
      // Try with encoded filename
      alternatives.push(`/uploaded_files/${encodeURIComponent(fileName)}`);
    } else {
      // Try with Files folder
      alternatives.push(`/Files/${fileName}`);
      alternatives.push(`/Files/${encodeURIComponent(fileName)}`);
      // Try with uploaded_files
      alternatives.push(`/uploaded_files/${fileName}`);
    }

    let attemptIndex = 0;
    const tryNextAlternative = () => {
      if (attemptIndex >= alternatives.length) {
        this.toastService.error('Failed to download file. The file may not exist on the server or the path is incorrect.');
        return;
      }

      const altPath = alternatives[attemptIndex];
      const altUrl = `${API_CONFIG.BASE_URL}${altPath}`;
      console.log(`Trying alternative path ${attemptIndex + 1}/${alternatives.length}:`, altUrl);
      
      this.http.get(altUrl, {
        responseType: 'blob',
        withCredentials: true,
        observe: 'response'
      }).subscribe({
        next: (response) => {
          const blob = response.body;
          if (blob) {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }, 100);
            this.toastService.success('File downloaded successfully');
          } else {
            attemptIndex++;
            tryNextAlternative();
          }
        },
        error: () => {
          attemptIndex++;
          tryNextAlternative();
        }
      });
    };

    tryNextAlternative();
  }

  getStatusClass(status: string): string {
    if (status === 'Completed') return 'status-completed';
    if (status === 'Under Process') return 'status-under-process';
    return 'status-on-hold';
  }

  getPriorityClass(priority: string): string {
    if (priority.toLowerCase().includes('high')) return 'priority-high';
    if (priority.toLowerCase().includes('medium')) return 'priority-medium';
    return 'priority-low';
  }
}

