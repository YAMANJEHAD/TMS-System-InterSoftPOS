namespace Backend.Models
{
    public class TransferUpdateDto
    {
        public int Id { get; set; }
        public string TerminalNumber { get; set; }
        public string TicketNo { get; set; }
        public string RejectReason { get; set; }
        public int FromTechId { get; set; }
        public int ToTechId { get; set; }
        public int StatusId { get; set; }
    }
}
