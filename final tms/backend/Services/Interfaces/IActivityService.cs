using System;
using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface IActivityService
    {
        IEnumerable<ActivityLogEntry> GetActivityFeed(int? userId, DateTime? from, DateTime? to);
    }
}
