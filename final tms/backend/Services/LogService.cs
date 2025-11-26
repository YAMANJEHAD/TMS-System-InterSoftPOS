using System;
using System.Data;
using System.Data.SqlClient;
using Backend.Services.Interfaces;

namespace Backend.Services
{
    public class LogService : ILogService
    {
        private readonly DbClient _dbClient;
        public LogService(DbClient dbClient) { _dbClient = dbClient; }

        public void InsertLog(int userId, string action, string tableName, int? recordId = null, string details = null)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("InsertLog", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@user_id", userId);
            cmd.Parameters.AddWithValue("@action", action);
            cmd.Parameters.AddWithValue("@table_name", tableName);
            cmd.Parameters.AddWithValue("@record_id", recordId.HasValue ? (object)recordId.Value : DBNull.Value);
            cmd.Parameters.AddWithValue("@details", details != null ? (object)details : DBNull.Value);
            conn.Open();
            cmd.ExecuteNonQuery();
        }
    }
}
