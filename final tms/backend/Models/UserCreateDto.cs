namespace Backend.Models
{
    public class UserCreateDto
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public int  RoleId { get; set; }
        public int DepartmentId { get; set; }
        public int Phone { get; set; }
    }
}
