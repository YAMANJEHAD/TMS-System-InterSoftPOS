namespace Backend.Models
{
    public class TaskSummary
    {
        public int TaskId { get; set; }
        public string Title { get; set; }
        public System.DateTime DueDate { get; set; }
        public string StatusName { get; set; }
        public string PriorityName { get; set; }
        public string ProjectName { get; set; }
        public string AsignTo { get; set; }
    }
}
