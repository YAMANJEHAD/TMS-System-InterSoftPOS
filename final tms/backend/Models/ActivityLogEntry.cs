namespace Backend.Models
{
    public class ActivityLogEntry
    {
        public int LogId { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; }
        public string Action { get; set; }
        public string TableName { get; set; }
        public int RecordId { get; set; }
        public string Details { get; set; }
        public System.DateTime CreatedAt { get; set; }
    }
}
