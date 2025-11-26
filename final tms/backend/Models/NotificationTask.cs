namespace Backend.Models
{
    public class NotificationTask
    {
        public int NotificationId { get; set; }
        public int TaskId { get; set; }
        public int UserId { get; set; }
        public string Message { get; set; }
        public string Type { get; set; }
        public bool IsRead { get; set; }
        public System.DateTime CreatedAt { get; set; }
    }
}
