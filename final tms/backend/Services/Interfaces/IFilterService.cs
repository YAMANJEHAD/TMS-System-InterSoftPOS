using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface IFilterService
    {
        IEnumerable<PriorityDto> GetPriorityForFilter();
        IEnumerable<ProjectDto> GetProjectForFilter();
        IEnumerable<ReasonDto> GetReasonForFilter();
        IEnumerable<StatusDto> GetStatusForFilter();
        IEnumerable<StatusDto> GetInventoryStatusForFilter();
        IEnumerable<TechnicianDto> GetTechniciansForFilter();
        IEnumerable<UserFilterDto> GetUsersForFilter();
        IEnumerable<PermissionsDto> GetAllPermissions(int userId);


    }
}
