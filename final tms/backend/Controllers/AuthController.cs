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

        public AuthController(
            DbClient dbClient,
            IPermissionService permissionService,
            ILogService logService,
            IHttpContextAccessor httpContextAccessor)
        {
            _dbClient = dbClient;
            _permissionService = permissionService;
            _logService = logService;
            _httpContextAccessor = httpContextAccessor;
        }

        // POST: api/auth/login
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
                return Unauthorized(new { message = "Invalid email or password." });

            var userId = (int)rdr["user_id"];
            var userName = rdr["name"].ToString();
            var userEmail = rdr["email"].ToString();
            var roleId = (int)rdr["role_id"];
            var avatarColor = rdr["avatar_color"] != DBNull.Value ? rdr["avatar_color"].ToString() : null;
            var theme = rdr["theme"] != DBNull.Value ? rdr["theme"].ToString() : null;
            var phone = rdr["phone"] != DBNull.Value ? rdr["phone"].ToString() : null;

            // Retrieve permissions from PermissionService
            var permissions = _permissionService.GetUserPermissions(userId);

            // Store in session
            var session = _httpContextAccessor.HttpContext.Session;
            session.SetInt32("UserId", userId);
            session.SetInt32("RoleId", roleId);
            session.SetString("UserName", userName);
            session.SetString("Permissions", JsonSerializer.Serialize(permissions));

            // Log login
            var details = $"Action: Login, Data: {JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "Login", "users", userId, details);

            return Ok(new
            {
                userId,
                name = userName,
                email = userEmail,
                roleId,
                permissions,
                avatarColor,
                theme,
                phone
            });
        }

        // GET: api/auth/session?datatype=int&key=UserId
        [HttpGet("session")]
        public IActionResult GetSessionValue([FromQuery] string datatype, [FromQuery] string key)
        {
            object value = null;

            if (datatype.ToLower() == "int")
            {
                value = HttpContext.Session.GetInt32(key);
            }
            else
            {
                value = HttpContext.Session.GetString(key);
            }

            if (value == null)
                return NotFound(new { message = "Session key not found." });

            return Ok(new { value });
        }
    }
}
