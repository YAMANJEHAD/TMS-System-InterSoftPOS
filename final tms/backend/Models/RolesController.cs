using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Models;
using Backend.Services;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RolesController : ControllerBase
    {
        private readonly DbClient _dbClient;

        public RolesController(DbClient dbClient)
        {
            _dbClient = dbClient;
        }

        // GET api/roles/get-roles
        [HttpGet("get-roles")]
        public IActionResult GetRoles()
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

            return Ok(roles);
        }
    }
}
