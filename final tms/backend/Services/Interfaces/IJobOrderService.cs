using System;
using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface IJobOrderService
    {
        IEnumerable<JobOrderDto> GetJobOrders(int month, int year);
        void InsertJobOrder(JobOrderCreateDto dto, string FilePath);
    }
}
