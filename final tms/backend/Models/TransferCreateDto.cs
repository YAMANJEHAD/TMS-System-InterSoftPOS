namespace Backend.Models
{
    public class TransferCreateDto
    {
        public string TerminalNumber { get; set; }
        public string TicketNo { get; set; }
        public int FromTechId { get; set; }
        public int ToTechId { get; set; }
    }
}
