using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransferController : ControllerBase
    {
        private readonly ITransferService _svc;
        private readonly ILogService _logService;
        private readonly INotificationService _notificationService;

        public TransferController(ITransferService svc, ILogService logService, INotificationService notificationService)
        {
            _svc = svc;
            _logService = logService;
            _notificationService = notificationService;
        }

        // Helper for permission check
        private bool HasPermission(string permission)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            return perms != null && perms.Contains(permission);
        }

        // Helper for logging
        private void LogAction(string actionName, string module, object data, int? entityId = null)
        {
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: {actionName}, Data: {JsonSerializer.Serialize(data)}";
            _logService.InsertLog(userId, actionName, module, entityId, details);
        }

        [HttpGet]
        public IActionResult GetAll([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
                                    [FromQuery] int? ticketNo, [FromQuery] int? duplicateCount,
                                    [FromQuery] int? terminalNumber, [FromQuery] int? userId)
        {
            if (!HasPermission("GetTransferTickets")) return Unauthorized();
            var list = _svc.GetAllTransferTicket(fromDate, toDate, ticketNo, duplicateCount, terminalNumber, userId);
            LogAction("GetTransferTickets", "transfertickets", new { fromDate, toDate, ticketNo, duplicateCount, terminalNumber, userId });
            return Ok(list);
        }

        [HttpPost]
        public IActionResult Create([FromBody] TransferCreateDto dto)
        {
            if (!HasPermission("InsertTransferTicket")) return Unauthorized();
            _svc.InsertTransferTicketNew(dto);
            LogAction("InsertTransferTicket", "transfertickets", dto);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            _notificationService.InsertNotification(0, userId, "Transfer ticket created", "TransferTicket");
            return NoContent();
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] TransferUpdateDto dto)
        {
            if (!HasPermission("UpdateTransferTicket")) return Unauthorized();
            dto.Id = id;
            _svc.UpdateTransferTicket(dto);
            LogAction("UpdateTransferTicket", "transfertickets", dto, id);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            _notificationService.InsertNotification(id, userId, "Transfer ticket updated", "TransferTicket");
            return NoContent();
        }

        //[HttpPatch("{id}/status")]
        //public IActionResult UpdateStatus(int id, [FromBody] StatusUpdateDto dto)
        //{
        //    if (!HasPermission("UpdateTransferTicketStatus")) return Unauthorized();
        //    _svc.UpdateTransferTicketStatus(id, dto.StatusId, dto.RejectReason);
        //    LogAction("UpdateTransferTicketStatus", "transfertickets", dto, id);
        //    var userId = HttpContext.Session.GetInt32("UserId").Value;
        //    _notificationService.InsertNotification(id, userId, "Transfer ticket status updated", "TransferStatus");
        //    return NoContent();
        //}

        [HttpPatch("{id}/ticket-status")]
        public IActionResult UpdateTicketStatus(int id, [FromBody] StatusUpdateDto dto)
        {
            if (!HasPermission("UpdateTicketStatus")) return Unauthorized();
            _svc.UpdateTicketStatus(id, dto.StatusId, dto.RejectReason);
            LogAction("UpdateTicketStatus", "transfertickets", dto, id);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            _notificationService.InsertNotification(id, userId, "Transfer ticket new status", "TicketStatus");
            return NoContent();
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            if (!HasPermission("DeleteTransferTicket")) return Unauthorized();
            _svc.DeleteTransferTicket(id);
            LogAction("DeleteTransferTicket", "transfertickets", new { id }, id);
            return NoContent();
        }
    }
}
