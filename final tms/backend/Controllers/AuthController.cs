using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Data;
using System.Data.SqlClient;
using Backend.Services;
using System.Text.Json;
using Backend.Helpers;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly DbClient _dbClient;
        private readonly IPermissionService _permissionService;
        private readonly ILogService _logService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AuthController(DbClient dbClient, IPermissionService permissionService, ILogService logService, IHttpContextAccessor httpContextAccessor)
        {
            _dbClient = dbClient;
            _permissionService = permissionService;
            _logService = logService;
            _httpContextAccessor = httpContextAccessor;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequestDto dto)
        {
            var encryptedPassword = EncryptionHelper.Encrypt(dto.Password);
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("LogIn", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@email", dto.Email);
            cmd.Parameters.AddWithValue("@password", encryptedPassword);
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            if (!rdr.Read())
                return Unauthorized();
            var userId = (int)rdr["user_id"];
            var userName = rdr["name"].ToString();
            var userEmail = rdr["email"].ToString();
            var roleId = (int)rdr["role_id"];

            // Retrieve permissions
            var permissions = _permissionService.GetUserPermissions(userId);

            // Store in session
            var session = _httpContextAccessor.HttpContext.Session;
            session.SetInt32("UserId", userId);
            session.SetInt32("RoleId", roleId);
            session.SetString("UserName", userName);
            session.SetString("Permissions", JsonSerializer.Serialize(permissions));

            dto.Password = encryptedPassword;
            // Log login
            var details = $"Action: Login, Data: {System.Text.Json.JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "Login", "users", userId, details);

            return Ok(new { UserId = userId, Name = userName, Email = userEmail, RoleId = roleId, Permissions = permissions });
        }

        [HttpGet("session")]
        public IActionResult GetSessionValue(string datatype, string key)
        {
            var value = "";
            if (datatype == "int")
            {
                value = HttpContext.Session.GetInt32(key).ToString();
            }
            else
            {
                value = HttpContext.Session.GetString(key);
            }
            return Ok(new { value });
        }
    }
}
