using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Helpers;
using Backend.Models;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Identity;

namespace Backend.Services
{
    public class UserService : IUserService
    {
        private readonly DbClient _dbClient;
        public UserService(DbClient dbClient)
        {
            _dbClient = dbClient;
        }

        public IEnumerable<UserDto> GetUsers()
        {
            var list = new List<UserDto>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("Get_Users", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new UserDto
                {
                    UserId = (int)rdr["user_id"],
                    Name = rdr["name"].ToString(),
                    Email = rdr["email"].ToString(),
                    RoleName = rdr["role_name"].ToString(),
                    DepartmentName = rdr["department_name"].ToString(),
                    IsActive = (bool)rdr["isActive"]
                });
            }
            return list;
        }

        public void InsertUser(string name, string email, string passwordHash, string roleId, int departmentId, int phone)
        {
            var encryptedPassword = EncryptionHelper.Encrypt(passwordHash);
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("Insert_User", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@name", name);
            cmd.Parameters.AddWithValue("@email", email);
            cmd.Parameters.AddWithValue("@password_hash", encryptedPassword);
            cmd.Parameters.AddWithValue("@role_id", roleId);
            cmd.Parameters.AddWithValue("@department_id", departmentId);
            cmd.Parameters.AddWithValue("@phone", phone);
            conn.Open();
            cmd.ExecuteNonQuery();
        }

        public void UpdateUser(int userId, string name, string email, string passwordHash, string roleId, int departmentId, int phone)
        {
            var encryptedPassword = EncryptionHelper.Encrypt(passwordHash);
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("Update_Users", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@user_id", userId);
            cmd.Parameters.AddWithValue("@name", name);
            cmd.Parameters.AddWithValue("@email", email);
            cmd.Parameters.AddWithValue("@password_hash", encryptedPassword);
            cmd.Parameters.AddWithValue("@role_id", roleId);
            cmd.Parameters.AddWithValue("@department_id", departmentId);
            cmd.Parameters.AddWithValue("@phone", phone);
            conn.Open();
            cmd.ExecuteNonQuery();
        }

        public void SetUserIsActive(int userId, bool isActive)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("Update_User_isActive", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@user_id", userId);
            cmd.Parameters.AddWithValue("@isActive", isActive);
            conn.Open();
            cmd.ExecuteNonQuery();
        }

        public void ResetPasswordById(int userId, string passwordHash)
        {
            var encryptedPassword = EncryptionHelper.Encrypt(passwordHash);
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("ResetPasswordById", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@user_id", userId);
            cmd.Parameters.AddWithValue("@new_password_hash", encryptedPassword);
            conn.Open();
            cmd.ExecuteNonQuery();
        }

        public void UpdateUserByUser(int userId, string name, string phone, string avatar_color, string theme)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("UpdateUserByUser", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@user_id", userId);
            cmd.Parameters.AddWithValue("@name", name);
            cmd.Parameters.AddWithValue("@phone", phone);
            cmd.Parameters.AddWithValue("@avatar_color", avatar_color);
            cmd.Parameters.AddWithValue("@theme", theme);
            conn.Open();
            cmd.ExecuteNonQuery();
        }
    }
}
