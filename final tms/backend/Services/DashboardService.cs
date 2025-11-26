using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Models;
using Backend.Services.Interfaces;

namespace Backend.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly DbClient _dbClient;
        public DashboardService(DbClient dbClient) => _dbClient = dbClient;

        public DashboardStatsDto GetDashboardStats()
        {
            var dto = new DashboardStatsDto();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetDashboardStats", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            if (rdr.Read())
            {
                dto.TotalTasks = (int)rdr["TotalTasks"];
                dto.CompletedTasks = (int)rdr["CompletedTasks"];
                dto.OnHoldTasks = (int)rdr["OnHoldTasks"];
                dto.UnderProcessTasks = (int)rdr["UnderProcessTasks"];
                dto.UnassignedTasks = (int)rdr["UnassignedTasks"];
                dto.OverdueTasks = (int)rdr["OverdueTasks"];
                dto.TotalUsers = (int)rdr["TotalUsers"];
                dto.ActiveUsers = (int)rdr["ActiveUsers"];
                dto.TotalProjects = (int)rdr["TotalProjects"];
                dto.RecentTasks = (int)rdr["RecentTasks"];
                dto.HighPriorityTasks = (int)rdr["HighPriorityTasks"];
                dto.CompletionRate = (decimal)rdr["CompletionRate"];
                dto.CompletionTrend = (int)rdr["CompletionTrend"];
                dto.LastWeekCompleted = (int)rdr["LastWeekCompleted"];
                dto.PreviousWeekCompleted = (int)rdr["PreviousWeekCompleted"];
            }

            // Next result: project counts
            dto.ProjectCounts = new List<ProjectCountDto>();
            if (rdr.NextResult())
            {
                while(rdr.Read())
                {
                    dto.ProjectCounts.Add(new ProjectCountDto
                    {
                        Name = rdr["name"].ToString(),
                        Count = (int)rdr["count"]
                    });
                }
            }

            // Next result: task counts by date
            dto.TaskCountsByDate = new List<TaskCountByDateDto>();
            if (rdr.NextResult())
            {
                while(rdr.Read())
                {
                    dto.TaskCountsByDate.Add(new TaskCountByDateDto
                    {
                        DueDate = (DateTime)rdr["due_date"],
                        TaskCount = (int)rdr["TaskCount"]
                    });
                }
            }

            return dto;
        }
    }
}
