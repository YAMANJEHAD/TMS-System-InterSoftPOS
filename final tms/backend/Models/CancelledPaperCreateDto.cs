namespace Backend.Models
{
    public class CancelledPaperCreateDto
    {
        public string CancelledTerminalNo { get; set; }
        public string DeliveredTerminalNo { get; set; }
        public string CancelledTicketNo { get; set; }
        public string DeliveredTicketNo { get; set; }
    }
}
