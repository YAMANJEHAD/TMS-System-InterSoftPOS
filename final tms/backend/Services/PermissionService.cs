using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Services.Interfaces;

namespace Backend.Services
{
    public class PermissionService : IPermissionService
    {
        private readonly DbClient _dbClient;
        public PermissionService(DbClient dbClient) { _dbClient = dbClient; }

        public void AddPermissionToRole(int roleId, int permissionId)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("AddPermissionToRole", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@RoleId", roleId);
            cmd.Parameters.AddWithValue("@PermissionId", permissionId);
            conn.Open();
            cmd.ExecuteNonQuery();
        }

        public void AssignPermissionToUser(int userId, int permissionId)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("AssignPermissionToUser", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@UserId", userId);
            cmd.Parameters.AddWithValue("@PermissionId", permissionId);
            conn.Open();
            cmd.ExecuteNonQuery();
        }

        public List<string> GetUserPermissions(int userId)
        {
            var permissions = new List<string>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetUserPermissions", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@UserId", userId);
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read()) { permissions.Add(rdr.GetString(0)); }
            return permissions;
        }
    }
}
