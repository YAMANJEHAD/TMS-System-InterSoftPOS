namespace Backend.Models
{
    public class InventoryChartItem
    {
        public int Count { get; set; }
        
        public DateTime? EntryDate { get; set; }
        public int? UserId { get; set; }
        public int? TechId { get; set; }
        public string ReasonName { get; set; }
    }
}
