namespace Backend.Models
{
    public class UserDto
    {
        public int UserId { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string RoleName { get; set; }
        public string DepartmentName { get; set; }
        public bool IsActive { get; set; }
        public string AvatarColor { get; set; }    // ÌÏíÏ
        public string Theme { get; set; }          // ÌÏíÏ
    }
}
