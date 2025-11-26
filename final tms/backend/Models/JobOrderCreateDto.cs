namespace Backend.Models
{
    public class JobOrderCreateDto
    {
        public System.DateTime? DueDate { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Ids { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FileBase64String { get; set; } = string.Empty;
    }
}
