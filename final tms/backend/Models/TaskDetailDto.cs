namespace Backend.Models
{
    public class TaskDetailDto
    {
        public int TaskId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public System.DateTime DueDate { get; set; }
        public string StatusName { get; set; }
        public string PriorityName { get; set; }
        public string ProjectName { get; set; }
        public string EntryUser { get; set; }
        public string AssignBy { get; set; }
        public string FileName { get; set; }
        public string FilePath { get; set; }
        public System.DateTime CreatedAt { get; set; }
        public System.DateTime UpdatedAt { get; set; }
        public string UpdatedUser { get; set; }
    }
}
