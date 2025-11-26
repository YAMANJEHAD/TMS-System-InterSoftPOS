using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface INotificationService
    {
        void ClearOldNotification();
        IEnumerable<NotificationTask> GetAllNotification(int userId);
        void InsertNotification(int taskId, int userId, string message, string type);
        void UpdateNotificationIsRead(int notificationId);
        void DeleteNotification(int notificationId);
    }
}
