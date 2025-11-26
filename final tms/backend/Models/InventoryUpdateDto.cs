namespace Backend.Models
{
    public class InventoryUpdateDto
    {
        public int TerminalId { get; set; }
        public string TerminalNumber { get; set; }
        public int ReasonId { get; set; }
        public string AltTerminalNumber { get; set; }
        public int TechId { get; set; }
        public string SerialNumber { get; set; }
        public string AltSerialNumber { get; set; }
        public int StatusId { get; set; }
        public string RejectReason { get; set; }
    }
}
