using System;
using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface IReportService
    {
        (IEnumerable<ReportProjectSummaryDto> ProjectSummaries, IEnumerable<UserPerformanceDto> UserPerformances) GetReportData(DateTime? startDate, DateTime? endDate);
    }
}
