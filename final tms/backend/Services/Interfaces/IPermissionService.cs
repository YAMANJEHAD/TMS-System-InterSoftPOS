using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface IPermissionService
    {
        void AddPermissionToRole(int roleId, int permissionId);
        void AssignPermissionToUser(int userId, int permissionId);
        List<string> GetUserPermissions(int userId);
        void RemovePermissionFromUser(int userId, int permissionId);

        List<PermissionModel> GetAllPermissions(int userId);
    }
}
