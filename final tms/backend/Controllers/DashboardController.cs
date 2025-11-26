using Microsoft.AspNetCore.Mvc;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _svc;
        private readonly ILogService _logService;

        public DashboardController(IDashboardService svc, ILogService logService)
        {
            _svc = svc;
            _logService = logService;
        }

        // Helper method for permissions
        private bool HasPermission(string permission)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            return perms != null && perms.Contains(permission);
        }

        // Helper method for logging
        private void LogAction(string actionName, string module, object data)
        {
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: {actionName}, Data: {JsonSerializer.Serialize(data)}";
            _logService.InsertLog(userId, actionName, module, details: details);
        }

        [HttpGet]   
        public IActionResult Get()
        {
            if (!HasPermission("GetDashboardStats")) return Unauthorized();

            var dto = _svc.GetDashboardStats();

            LogAction("GetDashboardStats", "dashboard", dto);

            return Ok(dto);
        }
    }
}
