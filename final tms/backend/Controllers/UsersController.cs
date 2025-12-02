using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Text.Json;
using Backend.Helpers;
using System.Linq;
using System.Collections.Generic;
using backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _svc;
        private readonly ILogService _logService;
        public UsersController(IUserService svc, ILogService logService)
        {
            _svc = svc;
            _logService = logService;
        }

        [HttpGet]
        public IActionResult GetAll([FromQuery] int PageNumber = 1, [FromQuery] int PageSize = 10)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("GetUsers")) return Unauthorized();
            var users = _svc.GetUsers(PageNumber, PageSize);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: GetUsers, Data: {{}}";
            _logService.InsertLog(userId, "GetUsers", "users", details: details);
            return Ok(users);
        }

        [HttpPost]
        public IActionResult Create([FromBody] UserCreateDto dto)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("InsertUser")) return Unauthorized();
            _svc.InsertUser(dto.Name, dto.Email, dto.PasswordHash, dto.RoleId, dto.DepartmentId, dto.Phone);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: InsertUser, Data: {JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "InsertUser", "users", details: details);
            return NoContent();
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] UserUpdateDto dto)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("UpdateUser")) return Unauthorized();
            _svc.UpdateUser(id, dto.Name, dto.Email, dto.PasswordHash, dto.RoleId, dto.DepartmentId, dto.Phone);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: UpdateUser, Data: {JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "UpdateUser", "users", id, details);
            return NoContent();
        }

        [HttpPut]
        public IActionResult UpdateUserByUser([FromBody] UpdateUserByUserDto dto)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("UpdateUserByUser")) return Unauthorized();
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            _svc.UpdateUserByUser(userId, dto.name, dto.phone, dto.avatar_color, dto.theme);
            var details = $"Action: UpdateUserByUser, Data: {JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "UpdateUserByUser", "users", userId, details);
            return NoContent();
        }

        [HttpPut("{id}/active")] 
        public IActionResult SetActive(int id, [FromQuery] bool isActive)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("SetUserIsActive")) return Unauthorized();
            _svc.SetUserIsActive(id, isActive);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: SetUserIsActive, Data: {{ \"id\": {id}, \"isActive\": {isActive} }}";
            _logService.InsertLog(userId, "SetUserIsActive", "users", id, details);
            return NoContent();
        }

        [HttpPatch("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("ResetUserPassword"))
                return Unauthorized();

            // Check if DTO is null
            if (dto == null)
                return BadRequest(new { message = "Request body is required", received = "null" });

            // Check if DTO is null
            if (dto.password != dto.confirmPassword)
                return BadRequest(new { message = "The passwords are not matched", received = "null" });

            // Check if password property is null or empty
            if (string.IsNullOrWhiteSpace(dto.password))
                return BadRequest(new { message = "Password is required", received = dto.password ?? "null" });

            _svc.ResetPasswordById(userId, dto.password);

            var details = $"Action: ResetPassword, Data: UserId={userId}";
            _logService.InsertLog(userId, "ResetPassword", "users", userId, details);

            return NoContent();
        }
    }
}
