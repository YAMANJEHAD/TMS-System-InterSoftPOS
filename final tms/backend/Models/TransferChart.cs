using System;
using System.Collections.Generic;

namespace Backend.Models
{
    public class TransferByUserDay
    {
        public DateTime Day { get; set; }
        public int User_Id { get; set; }
        public int Count { get; set; }
    }

    public class TransferByUserTotal
    {
        public int User_Id { get; set; }
        public int Count { get; set; }
    }

    public class TransferDayTotal
    {
        public DateTime Day { get; set; }
        public int Total_Count { get; set; }
    }

    public class TransferChartResponseDto
    {
        public List<TransferByUserDay> ByUserDay { get; set; } = new();
        public List<TransferByUserTotal> ByUserTotal { get; set; } = new();
        public List<TransferDayTotal> ByDayTotal { get; set; } = new();
    }
}
