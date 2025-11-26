namespace Backend.Models
{
    public class ReportProjectSummaryDto
    {
        public string ProjectName { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int OnHoldTasks { get; set; }
        public int UnderProcessTasks { get; set; }
    }
}
