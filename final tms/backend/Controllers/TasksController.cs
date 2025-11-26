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
    public class TasksController : ControllerBase
    {
        private readonly ITaskService _svc;
        private readonly ILogService _logService;
        private readonly INotificationService _notificationService;
        private readonly IWebHostEnvironment _env;

        public TasksController(ITaskService svc, ILogService logService, INotificationService notificationService, IWebHostEnvironment env)
        {
            _svc = svc;
            _logService = logService;
            _notificationService = notificationService;
            _env = env;

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
                                    [FromQuery] string title = "", [FromQuery] int statusId = -1,
                                    [FromQuery] int priorityId = -1, [FromQuery] int projectId = -1,
                                    [FromQuery] int userId = -1)
        {
            if (!HasPermission("GetTasks")) return Unauthorized();
            var tasks = _svc.GetAll(fromDate, toDate, title, statusId, priorityId, projectId, userId);
            LogAction("GetTasks", "tasks", new { fromDate, toDate, title, statusId, priorityId, projectId, userId });
            return Ok(tasks);
        }

        [HttpGet("{id}")]
        public IActionResult Get(int id)
        {
            if (!HasPermission("GetTasks")) return Unauthorized();
            var dto = _svc.GetTaskDetails(id);
            if (dto == null) return NotFound();
            LogAction("GetTaskDetails", "tasks", dto, id);
            return Ok(dto);
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] TaskCreateDto dto)
        {
            if (!HasPermission("InsertTask")) return Unauthorized();

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

            // Insert task normally
            _svc.InsertTask(dto, FilePath);
            LogAction("InsertTask", "tasks", dto);

            // Notify user
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            _notificationService.InsertNotification(0, userId, "Task created", "Task");

            return NoContent();
        }


        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] TaskUpdateDto dto)
        {
            if (!HasPermission("UpdateTask")) return Unauthorized();
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
            dto.TaskId = id;
            _svc.UpdateTask(dto, FilePath);
            LogAction("UpdateTask", "tasks", dto, id);
            var userId = HttpContext.Session.GetInt32("UserId").Value;
            _notificationService.InsertNotification(id, userId, "Task updated", "Task");
            return NoContent();
        }
    }
}
