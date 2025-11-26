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
    public class JobOrderService : IJobOrderService
    {
        private readonly DbClient _dbClient;
        private readonly ILogService _logService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public JobOrderService(DbClient dbClient, ILogService logService, IHttpContextAccessor httpContextAccessor)
        {
            _dbClient = dbClient;
            _logService = logService;
            _httpContextAccessor = httpContextAccessor;
        }

        public IEnumerable<JobOrderDto> GetJobOrders(int month, int year)
        {
            var list = new List<JobOrderDto>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetJobOrders", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@month", month);
            cmd.Parameters.AddWithValue("@year", year);
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new JobOrderDto
                {
                    TaskId = (int)rdr["task_id"],
                    FullTitle = rdr["FullTitle"].ToString(),
                    Title = rdr["title"].ToString(),
                    Description = rdr["description"].ToString(),
                    DueDate = (DateTime)rdr["due_date"],
                    CreatedAt = (DateTime)rdr["created_at"],
                    CreatedById = (int)rdr["created_by_id"],
                    UserName = rdr["name"].ToString(),
                    StatusName = rdr["status_name"].ToString(),
                    ProjectName = rdr["name"].ToString(), 
                    FileName = rdr["file_name"].ToString(),
                    FilePath = rdr["file_path"].ToString()
                });
            }
            return list;
        }

        public void InsertJobOrder(JobOrderCreateDto dto, string FilePath)
        {
            var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("InsertJobOrder", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@due_date", (object)dto.DueDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@title", dto.Title);
            cmd.Parameters.AddWithValue("@description", dto.Description);
            cmd.Parameters.AddWithValue("@entryUser", userId);
            cmd.Parameters.AddWithValue("@Ids", dto.Ids ?? string.Empty);
            cmd.Parameters.AddWithValue("@file_name", dto.FileName ?? string.Empty);
            cmd.Parameters.AddWithValue("@file_path", FilePath ?? string.Empty);
            conn.Open();
            cmd.ExecuteNonQuery();
            var details = $"Action: InsertJobOrder, Data: {JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "InsertJobOrder", "joborders", details: details);
        }
    }
}
