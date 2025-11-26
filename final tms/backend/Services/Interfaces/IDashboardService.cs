using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface IDashboardService
    {
        DashboardStatsDto GetDashboardStats();
    }
}
