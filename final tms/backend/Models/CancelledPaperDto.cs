namespace Backend.Models
{
    public class CancelledPaperDto
    {
        public int Id { get; set; }
        public string CancelledTerminalNo { get; set; }
        public string DeliveredTerminalNo { get; set; }
        public string EntryUser { get; set; }
        public System.DateTime EntryDate { get; set; }
        public string CancelledTicketNo { get; set; }
        public string DeliveredTicketNo { get; set; }
    }
}
