namespace Backend.Services.Interfaces
{
    public interface IPermissionService
    {
        void AddPermissionToRole(int roleId, int permissionId);
        void AssignPermissionToUser(int userId, int permissionId);
        System.Collections.Generic.List<string> GetUserPermissions(int userId);
    }
}
