using System;
using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface ITaskService
    {
        IEnumerable<TaskSummary> GetAll(DateTime? fromDate, DateTime? toDate, string title, int statusId, int priorityId, int projectId, int userId, int PageNumber, int PageSize);
        TaskDetailDto GetTaskDetails(int taskId);
        void InsertTask(TaskCreateDto dto, string FilePath);
        void UpdateTask(TaskUpdateDto dto, string FilePath);
    }
}
