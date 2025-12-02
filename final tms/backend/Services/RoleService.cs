using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Models;
using Backend.Services.Interfaces;

namespace Backend.Services
{
    public class RoleService : IRoleService
    {
        private readonly DbClient _dbClient;

        public RoleService(DbClient dbClient)
        {
            _dbClient = dbClient;
        }

        public List<RoleModel> GetRoles()
        {
            var roles = new List<RoleModel>();

            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetRoles", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };

            conn.Open();

            using var rdr = cmd.ExecuteReader();

            while (rdr.Read())
            {
                roles.Add(new RoleModel
                {
                    RoleId = rdr.GetInt32(0),
                    RoleName = rdr.GetString(1)
                });
            }

            return roles;
        }
    }
}
