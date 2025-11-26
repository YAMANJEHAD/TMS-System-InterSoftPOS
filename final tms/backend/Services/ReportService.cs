using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Models;
using Backend.Services.Interfaces;

namespace Backend.Services
{
    public class ReportService : IReportService
    {
        private readonly DbClient _dbClient;
        public ReportService(DbClient dbClient) => _dbClient = dbClient;

        public (IEnumerable<ReportProjectSummaryDto>, IEnumerable<UserPerformanceDto>) GetReportData(DateTime? startDate, DateTime? endDate)
        {
            var projects = new List<ReportProjectSummaryDto>();
            var users = new List<UserPerformanceDto>();

            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetReportData", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@StartDate", (object)startDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@EndDate", (object)endDate ?? DBNull.Value);
            conn.Open();

            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                projects.Add(new ReportProjectSummaryDto
                {
                    ProjectName = rdr["ProjectName"].ToString(),
                    TotalTasks = (int)rdr["TotalTasks"],
                    CompletedTasks = (int)rdr["CompletedTasks"],
                    OnHoldTasks = (int)rdr["OnHoldTasks"],
                    UnderProcessTasks = (int)rdr["UnderProcessTasks"]
                });
            }

            if (rdr.NextResult())
            {
                while (rdr.Read())
                {
                    users.Add(new UserPerformanceDto
                    {
                        UserId = (int)rdr["user_id"],
                        InventoryCount = (int)rdr["InventoryCount"],
                        TransferCount = (int)rdr["TransferCount"]
                    });
                }
            }

            return (projects, users);
        }
    }
}
