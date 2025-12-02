namespace Backend.Services
{
    public class PermissionsDto
    {
        public int PermissionsId { get; set; }
        public string? PermissionsName { get; internal set; }
        public bool HasPermission { get; set; }
    }
}