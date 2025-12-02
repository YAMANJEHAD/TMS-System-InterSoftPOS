using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Models;
using Backend.Services.Interfaces;

namespace Backend.Services
{
    public class NotificationService : INotificationService
    {
        private readonly DbClient _dbClient;
        public NotificationService(DbClient dbClient)
        {
            _dbClient = dbClient;
        }

        public void ClearOldNotification()
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("ClearOldNotification", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            conn.Open();
            cmd.ExecuteNonQuery();
        }

        public IEnumerable<NotificationTask> GetAllNotification(int userId)
        {
            var list = new List<NotificationTask>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetAllNotification", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@user_id", userId);
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new NotificationTask
                {
                    NotificationId = (int)rdr["notification_id"],
                    TaskId = (int)rdr["task_id"],
                    UserId = (int)rdr["user_id"],
                    Message = rdr["message"].ToString(),
                    Type = rdr["type"].ToString(),
                    IsRead = (bool)rdr["is_read"],
                    CreatedAt = (System.DateTime)rdr["created_at"]
                });
            }
            return list;
        }

        public IEnumerable<NotificationTask> GetNotification(int userId)
        {
            var list = new List<NotificationTask>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetNotification", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@user_id", userId);
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new NotificationTask
                {
                    NotificationId = (int)rdr["notification_id"],
                    TaskId = (int)rdr["task_id"],
                    UserId = (int)rdr["user_id"],
                    Message = rdr["message"].ToString(),
                    Type = rdr["type"].ToString(),
                    IsRead = (bool)rdr["is_read"],
                    CreatedAt = (System.DateTime)rdr["created_at"]
                });
            }
            return list;
        }

        public void InsertNotification(int taskId, int userId, string message, string type)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("InsertNotification", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@task_id", taskId);
            cmd.Parameters.AddWithValue("@user_id", userId);
            cmd.Parameters.AddWithValue("@message", message);
            cmd.Parameters.AddWithValue("@type", type);
            conn.Open();
            cmd.ExecuteNonQuery();
        }

        public void UpdateNotificationIsRead(int notificationId)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("UpdateNotificationIsRead", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@notification_id", notificationId);
            conn.Open();
            cmd.ExecuteNonQuery();
        }
    }
}
