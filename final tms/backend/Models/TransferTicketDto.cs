namespace Backend.Models
{
    public class TransferTicketDto
    {
        public int Id { get; set; }
        public string TerminalNumber { get; set; }
        public System.DateTime CreatedAt { get; set; }
        public string UserName { get; set; }
        public string TicketNo { get; set; }
        public string RejectReason { get; set; }
        public string FromTech { get; set; }
        public string ToTech { get; set; }
        public string StatusName { get; set; }
        public int DuplicateCount { get; set; }
        
    }
}
