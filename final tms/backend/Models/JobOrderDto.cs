namespace Backend.Models
{
    public class JobOrderDto
    {
        public int TaskId { get; set; }
        public string FullTitle { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public System.DateTime DueDate { get; set; }
        public System.DateTime CreatedAt { get; set; }
        public int CreatedById { get; set; }
        public string UserName { get; set; }
        public string StatusName { get; set; }
        public string ProjectName { get; set; }
        public string FileName { get; set; }
        public string FilePath { get; set; }
    }
}
