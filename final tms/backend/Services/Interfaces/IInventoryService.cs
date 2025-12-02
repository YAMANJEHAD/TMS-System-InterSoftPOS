using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface IInventoryService
    {
        IEnumerable<InventoryChartItem> GetInventoryChart();
        IEnumerable<InventoryItemDto> GetInventoryByStatus(int statusId, int PageNumber, int PageSize);
        void InsertInventory(InventoryCreateDto dto);
        void UpdateInventory(InventoryUpdateDto dto);
        void UpdateInventoryStatus(int terminalId, int statusId, string rejectReason);
        void DeleteInventory(int terminalId);
        void InsertTechnician(string tech_name);
    }
}
