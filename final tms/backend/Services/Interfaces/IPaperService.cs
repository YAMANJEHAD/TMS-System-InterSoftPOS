using System;
using System.Collections.Generic;
using Backend.Models;

namespace Backend.Services.Interfaces
{
    public interface IPaperService
    {
        IEnumerable<CancelledPaperDto> GetPaper(DateTime? fromDate, DateTime? toDate, int? entryUser);
        void InsertPaper(CancelledPaperCreateDto dto, int EntryUser);
        void UpdatePaper(CancelledPaperUpdateDto dto);
        void DeletePaper(int id);
    }
}
