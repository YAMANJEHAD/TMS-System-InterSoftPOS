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
    public class JobOrdersController : ControllerBase
    {
        private readonly IJobOrderService _svc;
        private readonly ILogService _logService;
        private readonly INotificationService _notificationService;
        private readonly IWebHostEnvironment _env;

        public JobOrdersController(IJobOrderService svc, ILogService logService, INotificationService notificationService, IWebHostEnvironment env)
        {
            _svc = svc;
            _logService = logService;
            _notificationService = notificationService;
            _env = env;

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

        [HttpGet]
        public IActionResult GetAll([FromQuery] int month = 0, [FromQuery] int year = 0)
        {
            if (!HasPermission("GetJobOrders")) return Unauthorized();
            var list = _svc.GetJobOrders(month, year);
            LogAction("GetJobOrders", "joborders", new { Month = month, Year = year });
            return Ok(list);
        }

        [HttpPost]
        public IActionResult Create([FromBody] JobOrderCreateDto dto)
        {
            if (!HasPermission("InsertJobOrder")) return Unauthorized();
            string FilePath = "";

            // Handle file saving
            if (!string.IsNullOrEmpty(dto.FileBase64String) && !string.IsNullOrEmpty(dto.FileName))
            {
                try
                {
                    // Create the folder if it doesn't exist
                    var folderPath = Path.Combine(_env.WebRootPath, "Files");
                    if (!Directory.Exists(folderPath))
                        Directory.CreateDirectory(folderPath);

                    // Generate unique file name with datetime
                    var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                    var ext = Path.GetExtension(dto.FileName);
                    var fileNameWithoutExt = Path.GetFileNameWithoutExtension(dto.FileName);
                    var newFileName = $"{fileNameWithoutExt}_{timestamp}{ext}";

                    // Decode Base64 and save
                    var fileBytes = Convert.FromBase64String(dto.FileBase64String);
                    var filePath = Path.Combine(folderPath, newFileName);
                    System.IO.File.WriteAllBytes(filePath, fileBytes);

                    // Optional: return file path
                    FilePath = $"/Files/{newFileName}";
                }
                catch (Exception ex)
                {
                    return BadRequest(new { message = "File could not be saved", error = ex.Message });
                }
            }
            _svc.InsertJobOrder(dto, FilePath);
            LogAction("InsertJobOrder", "joborders", dto);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            _notificationService.InsertNotification(0, userId, "Job order created", "JobOrder");
            return NoContent();
        }
    }
}
