namespace Backend.Models
{
    public class NotificationCreateDto
    {
        public int TaskId { get; set; }
        public int UserId { get; set; }
        public string Message { get; set; }
        public string Type { get; set; }
    }
}
