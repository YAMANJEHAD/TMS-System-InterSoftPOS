using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services.Interfaces;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _svc;
        private readonly ILogService _logService;
        private readonly INotificationService _notificationService;

        public InventoryController(
            IInventoryService svc,
            ILogService logService,
            INotificationService notificationService)
        {
            _svc = svc;
            _logService = logService;
            _notificationService = notificationService;
        }

        // Helper method for permissions
        private bool HasPermission(string permission)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            return perms != null && perms.Contains(permission);
        }

        // Helper method for logging
        private void LogAction(string actionName, string module, object data, int? terminalId = null)
        {
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: {actionName}, Data: {JsonSerializer.Serialize(data)}";
            _logService.InsertLog(userId, actionName, module, terminalId, details);
        }

        [HttpGet("chart")]
        public IActionResult Chart()
        {
            if (!HasPermission("GetInventoryChart")) return Unauthorized();
            LogAction("GetInventoryChart", "inventory", 0);
            return Ok(_svc.GetInventoryChart());
        }

        [HttpGet("status/{statusId}")]
        public IActionResult GetByStatus(int statusId, int PageNumber = 1, int PageSize = 10)
        {
            if (!HasPermission("GetByStatus")) return Unauthorized();
            LogAction("GetByStatus", "inventory", statusId);
            return Ok(_svc.GetInventoryByStatus(statusId, PageNumber, PageSize));
        }

        [HttpPost]
        public IActionResult Create([FromBody] InventoryCreateDto dto)
        {
            if (!HasPermission("InsertInventory")) return Unauthorized();
            _svc.InsertInventory(dto);
            LogAction("InsertInventory", "inventory", dto);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            _notificationService.InsertNotification(0, userId, "Inventory created", "Inventory");
            return NoContent();
        }

        [HttpPost("InsertTechnician")]
        public IActionResult InsertTechnician([FromBody] string tech_name)
        {
            if (!HasPermission("InsertTechnician")) return Unauthorized();
            _svc.InsertTechnician(tech_name);
            LogAction("InsertTechnician", "Technician", tech_name);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            return NoContent();
        }

        [HttpPut("{terminalId}")]
        public IActionResult Update(int terminalId, [FromBody] InventoryUpdateDto dto)
        {
            if (!HasPermission("UpdateInventory")) return Unauthorized();
            dto.TerminalId = terminalId;
            _svc.UpdateInventory(dto);
            LogAction("UpdateInventory", "inventory", dto, terminalId);
            return NoContent();
        }

        [HttpDelete("{terminalId}")]
        public IActionResult Delete(int terminalId)
        {
            if (!HasPermission("DeleteInventory")) return Unauthorized();
            _svc.DeleteInventory(terminalId);
            LogAction("DeleteInventory", "inventory", terminalId, terminalId);
            return NoContent();
        }

        [HttpPatch("{terminalId}/status")]
        public IActionResult UpdateStatus(int terminalId, [FromBody] StatusUpdateDto dto)
        {
            if (!HasPermission("UpdateInventoryStatus")) return Unauthorized();
            _svc.UpdateInventoryStatus(terminalId, dto.StatusId, dto.RejectReason);
            LogAction("UpdateInventoryStatus", "inventory", dto, terminalId);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            _notificationService.InsertNotification(terminalId, userId, "Inventory status updated", "InventoryStatus");
            return NoContent();
        }
    }
}
