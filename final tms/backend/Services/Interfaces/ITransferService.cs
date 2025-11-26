using System;
using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface ITransferService
    {
        IEnumerable<TransferTicketDto> GetAllTransferTicket(DateTime? fromDate, DateTime? toDate, int? ticketNo, int? duplicateCount, int? terminalNumber, int? userId);
        void InsertTransferTicketNew(TransferCreateDto dto);
        void UpdateTransferTicket(TransferUpdateDto dto);
        
        void UpdateTicketStatus(int id, int statusId, string rejectReason);
        void DeleteTransferTicket(int id);
    }
}
