using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface IUserService
    {
        IEnumerable<UserDto> GetUsers(int PageNumber, int PageSize);
        void InsertUser(string name, string email, string passwordHash, int roleId, int departmentId, int phone);
        void UpdateUser(int userId, string name, string email, string passwordHash, int roleId, int departmentId, int phone);
        void UpdateUserByUser(int userId, string name, string phone, string avatar_color, string theme);
        void SetUserIsActive(int userId, bool isActive);
        void ResetPasswordById(int userId, string passwordHash);
    }
}
