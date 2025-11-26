using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Models;
using Backend.Services.Interfaces;

namespace Backend.Services
{
    public class ActivityService : IActivityService
    {
        private readonly DbClient _dbClient;
        public ActivityService(DbClient dbClient)
        {
            _dbClient = dbClient;
        }

        public IEnumerable<ActivityLogEntry> GetActivityFeed(int? userId, DateTime? from, DateTime? to)
        {
            var list = new List<ActivityLogEntry>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetActivityFeedByDate", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@userId", userId);
            cmd.Parameters.AddWithValue("@fromDate", (object)from ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@toDate", (object)to ?? DBNull.Value);
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new ActivityLogEntry
                {
                    LogId = (int)rdr["log_id"],
                    UserId = (int)rdr["user_id"],
                    UserName = rdr["user_name"].ToString(),
                    Action = rdr["action"].ToString(),
                    TableName = rdr["table_name"].ToString(),
                    RecordId = (int)rdr["record_id"],
                    Details = rdr["details"].ToString(),
                    CreatedAt = (DateTime)rdr["created_at"]
                });
            }
            return list;
        }
    }
}
