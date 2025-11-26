using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Models;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace Backend.Services
{
    public class TaskService : ITaskService
    {
        private readonly DbClient _dbClient;
        private readonly ILogService _logService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public TaskService(DbClient dbClient, ILogService logService, IHttpContextAccessor httpContextAccessor)
        {
            _dbClient = dbClient;
            _logService = logService;
            _httpContextAccessor = httpContextAccessor;
        }

        public IEnumerable<TaskSummary> GetAll(DateTime? fromDate, DateTime? toDate, string title, int statusId, int priorityId, int projectId, int userId)
        {
            var list = new List<TaskSummary>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetAllTasks", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@fromDate", (object)fromDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@toDate", (object)toDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@title", title ?? string.Empty);
            cmd.Parameters.AddWithValue("@status_id", statusId);
            cmd.Parameters.AddWithValue("@priority_id", priorityId);
            cmd.Parameters.AddWithValue("@project_id", projectId);
            cmd.Parameters.AddWithValue("@user_id", userId);
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new TaskSummary
                {
                    TaskId = (int)rdr["task_id"],
                    Title = rdr["title"].ToString(),
                    DueDate = (DateTime)rdr["due_date"],
                    StatusName = rdr["status_name"].ToString(),
                    PriorityName = rdr["priority_name"].ToString(),
                    ProjectName = rdr["project_name"].ToString(),
                    EntryUser = rdr["EntryUser"].ToString()
                });
            }
            return list;
        }

        public TaskDetailDto GetTaskDetails(int taskId)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetTaskDetails", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@task_id", taskId);
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            if (rdr.Read())
            {
                return new TaskDetailDto
                {
                    TaskId = (int)rdr["task_id"],
                    Title = rdr["title"].ToString(),
                    Description = rdr["description"].ToString(),
                    DueDate = (DateTime)rdr["due_date"],
                    StatusName = rdr["status_name"].ToString(),
                    PriorityName = rdr["priority_name"].ToString(),
                    ProjectName = rdr["project_name"].ToString(),
                    EntryUser = rdr["EntryUser"].ToString(),
                    AssignBy = rdr["AssignBy"].ToString(),
                    FileName = rdr["file_name"].ToString(),
                    FilePath = rdr["file_path"].ToString(),
                    CreatedAt = (DateTime)rdr["created_at"],
                    UpdatedAt = (DateTime)rdr["updated_at"],
                    UpdatedUser = rdr["UpdatedUser"].ToString()
                };
            }
            return null;
        }

        public void InsertTask(TaskCreateDto dto, string FilePath)
        {
            var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("InsertTask", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@title", dto.Title);
            cmd.Parameters.AddWithValue("@description", dto.Description);
            cmd.Parameters.AddWithValue("@due_date", (object)dto.DueDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@status_id", dto.StatusId);
            cmd.Parameters.AddWithValue("@priority_id", dto.PriorityId);
            cmd.Parameters.AddWithValue("@project_id", dto.ProjectId);
            cmd.Parameters.AddWithValue("@entryUser", userId);
            cmd.Parameters.AddWithValue("@Ids", dto.Ids ?? string.Empty);
            cmd.Parameters.AddWithValue("@file_name", dto.FileName ?? string.Empty);
            cmd.Parameters.AddWithValue("@file_path", FilePath ?? string.Empty);
            conn.Open();
            cmd.ExecuteNonQuery();
            var details = $"Action: InsertTask, Data: {JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "InsertTask", "tasks", details: details);
        }

        public void UpdateTask(TaskUpdateDto dto, string FilePath)
        {
            var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("UpdateTask", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@task_id", dto.TaskId);
            cmd.Parameters.AddWithValue("@title", dto.Title ?? string.Empty);
            cmd.Parameters.AddWithValue("@description", dto.Description ?? string.Empty);
            cmd.Parameters.AddWithValue("@due_date", (object)dto.DueDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@status_id", (object)dto.StatusId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@priority_id", (object)dto.PriorityId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@project_id", (object)dto.ProjectId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@entryUser", userId);
            cmd.Parameters.AddWithValue("@Ids", dto.Ids ?? string.Empty);
            cmd.Parameters.AddWithValue("@file_name", dto.FileName ?? string.Empty);
            cmd.Parameters.AddWithValue("@file_path", FilePath ?? string.Empty);
            conn.Open();
            cmd.ExecuteNonQuery();
            var details = $"Action: UpdateTask, Data: {JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "UpdateTask", "tasks", dto.TaskId, details);
        }
    }
}
