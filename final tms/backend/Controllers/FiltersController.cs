using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FiltersController : ControllerBase
    {
        private readonly IFilterService _svc;
        private readonly ILogService _logService;

        public FiltersController(IFilterService svc, ILogService logService)
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

        [HttpGet("priorities")]
        public IActionResult GetPriorities()
        {
            if (!HasPermission("GetFilters")) return Unauthorized();
            var result = _svc.GetPriorityForFilter();
            LogAction("GetPriorities", "filters", result);
            return Ok(result);
        }

        [HttpGet("projects")]
        public IActionResult GetProjects()
        {
            if (!HasPermission("GetFilters")) return Unauthorized();
            var result = _svc.GetProjectForFilter();
            LogAction("GetProjects", "filters", result);
            return Ok(result);
        }

        [HttpGet("reasons")]
        public IActionResult GetReasons()
        {
            if (!HasPermission("GetFilters")) return Unauthorized();
            var result = _svc.GetReasonForFilter();
            LogAction("GetReasons", "filters", result);
            return Ok(result);
        }

        [HttpGet("statuses")]
        public IActionResult GetStatuses()
        {
            if (!HasPermission("GetFilters")) return Unauthorized();
            var result = _svc.GetStatusForFilter();
            LogAction("GetStatuses", "filters", result);
            return Ok(result);
        }

        [HttpGet("technicians")]
        public IActionResult GetTechnicians()
        {
            if (!HasPermission("GetFilters")) return Unauthorized();
            var result = _svc.GetTechniciansForFilter();
            LogAction("GetTechnicians", "filters", result);
            return Ok(result);
        }

        [HttpGet("users")]
        public IActionResult GetUsers()
        {
            if (!HasPermission("GetFilters")) return Unauthorized();
            var result = _svc.GetUsersForFilter();
            LogAction("GetUsers", "filters", result);
            return Ok(result);
        }
    }
}
