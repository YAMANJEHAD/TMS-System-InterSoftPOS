namespace Backend.Models
{
    public class UserUpdateDto
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string RoleId { get; set; }
        public int DepartmentId { get; set; }
        public int Phone { get; set; }
        
       
    }
}
