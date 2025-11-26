using Microsoft.AspNetCore.Mvc;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _svc;
        private readonly ILogService _logService;

        public ReportsController(IReportService svc, ILogService logService)
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
        private void LogAction(string actionName, string module, object data)
        {
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: {actionName}, Data: {JsonSerializer.Serialize(data)}";
            _logService.InsertLog(userId, actionName, module, details: details);
        }

        [HttpGet]
        public IActionResult Get([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            if (!HasPermission("GetReports")) return Unauthorized();

            var (projects, users) = _svc.GetReportData(startDate, endDate);

            LogAction("GetReports", "reports", new { StartDate = startDate, EndDate = endDate });

            return Ok(new { projects, users });
        }
    }
}
