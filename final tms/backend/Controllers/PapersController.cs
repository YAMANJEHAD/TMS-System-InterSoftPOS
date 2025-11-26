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
    public class PapersController : ControllerBase
    {
        private readonly IPaperService _svc;
        private readonly ILogService _logService;

        public PapersController(IPaperService svc, ILogService logService)
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

        [HttpGet]
        public IActionResult GetAll([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] int? entryUser)
        {
            if (!HasPermission("GetPapers")) return Unauthorized();
            var list = _svc.GetPaper(fromDate, toDate, entryUser);
            LogAction("GetPapers", "papers", new { FromDate = fromDate, ToDate = toDate, EntryUser = entryUser });
            return Ok(list);
        }

        [HttpPost]
        public IActionResult Create([FromBody] CancelledPaperCreateDto dto)
        {
            int userId = HttpContext.Session.GetInt32("UserId").Value;
            if (!HasPermission("InsertPaper")) return Unauthorized();
            _svc.InsertPaper(dto, userId);
            LogAction("InsertPaper", "papers", dto);
            return NoContent();
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] CancelledPaperUpdateDto dto)
        {
            if (!HasPermission("UpdatePaper")) return Unauthorized();
            dto.Id = id;
            _svc.UpdatePaper(dto);
            LogAction("UpdatePaper", "papers", dto, id);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            if (!HasPermission("DeletePaper")) return Unauthorized();
            _svc.DeletePaper(id);
            LogAction("DeletePaper", "papers", null, id);
            return NoContent();
        }
    }
}
