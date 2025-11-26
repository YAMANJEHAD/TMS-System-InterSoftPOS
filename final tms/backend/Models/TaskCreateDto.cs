namespace Backend.Models
{
    public class TaskCreateDto
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public System.DateTime? DueDate { get; set; }
        public int StatusId { get; set; }
        public int PriorityId { get; set; }
        public int ProjectId { get; set; }
        public string Ids { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FileBase64String { get; set; } = string.Empty;
    }
}
