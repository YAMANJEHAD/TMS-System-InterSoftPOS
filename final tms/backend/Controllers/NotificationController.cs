using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Text.Json;
using System.Collections.Generic;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _svc;
        private readonly ILogService _logService;
        public NotificationsController(INotificationService svc, ILogService logService)
        {
            _svc = svc;
            _logService = logService;
        }

        [HttpDelete("clear-old")]  
        public IActionResult ClearOld()
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("ClearOldNotification")) return Unauthorized();
            _svc.ClearOldNotification();
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: ClearOldNotification, Data: {{}}";
            _logService.InsertLog(userId, "ClearOldNotification", "notification_tasks", null, details);
            return NoContent();
        }

        [HttpGet("{userId}")]
        public IActionResult GetAll(int userId)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("ViewNotifications")) return Unauthorized();
            var result = _svc.GetAllNotification(userId);
            var details = $"Action: GetAllNotification, Data: {{ \"userId\": {userId} }}";
            _logService.InsertLog(HttpContext.Session.GetInt32("UserId").Value, "GetAllNotification", "notification_tasks", userId, details);
            return Ok(result);
        }

        [HttpGet("GetNotification")]
        public IActionResult GetNotification(int userId)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("ViewNotifications")) return Unauthorized();
            var result = _svc.GetNotification(userId);
            var details = $"Action: GetNotification, Data: {{ \"userId\": {userId} }}";
            _logService.InsertLog(HttpContext.Session.GetInt32("UserId").Value, "GetNotification", "notification_tasks", userId, details);
            return Ok(result);
        }

        [HttpPost]
        public IActionResult Create([FromBody] NotificationCreateDto dto)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("InsertNotification")) return Unauthorized();
            _svc.InsertNotification(dto.TaskId, dto.UserId, dto.Message, dto.Type);
            var details = $"Action: InsertNotification, Data: {System.Text.Json.JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(HttpContext.Session.GetInt32("UserId").Value, "InsertNotification", "notification_tasks", dto.TaskId, details);
            return NoContent();
        }

        [HttpPut("{id}/read")]
        public IActionResult MarkRead(int id)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("UpdateNotificationIsRead")) return Unauthorized();
            _svc.UpdateNotificationIsRead(id);
            var details = $"Action: UpdateNotificationIsRead, Data: {{ \"notificationId\": {id} }}";
            _logService.InsertLog(HttpContext.Session.GetInt32("UserId").Value, "UpdateNotificationIsRead", "notification_tasks", id, details);
            return NoContent();
        }
    }
}
