using System.Collections.Generic;

namespace Backend.Models
{
    public class DashboardStatsDto
    {
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int OnHoldTasks { get; set; }
        public int UnderProcessTasks { get; set; }
        public int UnassignedTasks { get; set; }
        public int OverdueTasks { get; set; }
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int TotalProjects { get; set; }
        public int RecentTasks { get; set; }
        public int HighPriorityTasks { get; set; }
        public decimal CompletionRate { get; set; }
        public decimal CompletionTrend { get; set; }
        public int LastWeekCompleted { get; set; }
        public int PreviousWeekCompleted { get; set; }

        public List<ProjectCountDto> ProjectCounts { get; set; }
        public List<TaskCountByDateDto> TaskCountsByDate { get; set; }
    }
}
