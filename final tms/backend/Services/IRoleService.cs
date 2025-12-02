using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface IRoleService
    {
        List<RoleModel> GetRoles();
    }
}
