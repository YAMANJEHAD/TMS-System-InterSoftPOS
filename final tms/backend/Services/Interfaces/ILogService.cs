namespace Backend.Services.Interfaces
{
    public interface ILogService
    {
        void InsertLog(int userId, string action, string tableName, int? recordId = null, string details = null);
    }
}
