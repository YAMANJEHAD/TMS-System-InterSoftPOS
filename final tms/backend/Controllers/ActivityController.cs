using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services.Interfaces;
using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ActivityController : ControllerBase
    {
        private readonly IActivityService _svc;
        private readonly ILogService _logService;
        public ActivityController(IActivityService svc, ILogService logService)
        {
            _svc = svc;
            _logService = logService;
        }

        [HttpGet]
        public IActionResult GetByDate(int? userId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var perms = JsonSerializer.Deserialize<List<string>>(HttpContext.Session.GetString("Permissions"));
            if (perms == null || !perms.Contains("ViewActivity")) return Unauthorized();
            var feed = _svc.GetActivityFeed(userId, from, to);
            var currentUser = HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: GetActivityFeed, Data: {JsonSerializer.Serialize(new { userId, from, to })}";
            _logService.InsertLog(currentUser, "GetActivityFeed", "activities", details: details);
            return Ok(feed);
        }
    }
}
