using Microsoft.AspNetCore.Mvc;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text.Json;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RolePermissionController : ControllerBase
    {
        private readonly IPermissionService _svc;
        private readonly ILogService _logService;

        public RolePermissionController(IPermissionService svc, ILogService logService)
        {
            _svc = svc;
            _logService = logService;
        }

        // Helper method for permission check
        private bool HasPermission(string permission)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            return perms != null && perms.Contains(permission);
        }

        // Helper method for logging
        private void LogAction(string actionName, string module, object data, int? entityId = null)
        {
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: {actionName}, Data: {JsonSerializer.Serialize(data)}";
            _logService.InsertLog(userId, actionName, module, entityId, details);
        }

        

        // Add permission to role
        [HttpPost("AddPermissionToRole")]
        public IActionResult AddPermissionToRole([FromBody] AddPermissionToRoleDto dto)
        {
            if (!HasPermission("AddPermissionToRole"))
                return Unauthorized();

            _svc.AddPermissionToRole(dto.RoleId, dto.PermissionId);

            LogAction("AddPermissionToRole", "permissions", dto);

            return NoContent();
        }

        // Assign permission to user
        [HttpPost("AssignPermissionToUser")]
        public IActionResult AssignPermissionToUser([FromBody] AssignPermissionToUserDto dto)
        {
            if (!HasPermission("AssignPermissionToUser"))
                return Unauthorized();

            _svc.AssignPermissionToUser(dto.UserId, dto.PermissionId);

            LogAction("AssignPermissionToUser", "permissions", dto);

            return NoContent();
        }

        // Remove permission from user
        [HttpDelete("remove-from-user")]
        public IActionResult RemovePermissionFromUser([FromBody] AssignPermissionToUserDto dto)
        {
            if (!HasPermission("RemovePermissionFromUser"))
                return Unauthorized();

            _svc.RemovePermissionFromUser(dto.UserId, dto.PermissionId);

            LogAction("RemovePermissionFromUser", "permissions", dto);

            return NoContent();
        }

    }
}
