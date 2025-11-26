namespace Backend.Models
{
    public class InventoryItemDto
    {
        public int TerminalId { get; set; }
        public string TerminalNumber { get; set; }
        public DateTime EntryDate { get; set; }
        public string AltTerminalNumber { get; set; }
        public string SerialNumber { get; set; }
        public string AltSerialNumber { get; set; }
        public string RejectReason { get; set; }
        public string TechName { get; set; }
        public string StatusName { get; set; }
        public string UserName { get; set; }
        public string ReasonName { get; set; }
    }
}
