
namespace Backend.Services
{
    internal class TaskFile
    {
        public int TaskId { get; set; }
        public string FileName { get; set; }
        public string FilePath { get; set; }
        public DateTime UploadedAt { get; set; }
    }
}