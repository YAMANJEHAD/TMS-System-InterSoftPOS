namespace Backend.Models
{
    public class InventoryCreateDto
    {
        public string TerminalNumber { get; set; }
        public int ReasonId { get; set; }
        public string AltTerminalNumber { get; set; }
        public int TechId { get; set; }
        public string SerialNumber { get; set; }
        public string AltSerialNumber { get; set; }
    }
}
