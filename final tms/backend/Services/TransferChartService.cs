using Backend.Models;
using Backend.Services.Interfaces;
using System.Data.SqlClient;

namespace Backend.Services
{
    public class TransferChartService : ITransferChartService
    {
        private readonly DbClient _dbClient;

        public TransferChartService(DbClient dbClient)
        {
            _dbClient = dbClient;
        }

        public async Task<TransferChartResponseDto> GetTransferChartAsync()
        {
            var result = new TransferChartResponseDto();

            using var conn = (SqlConnection)_dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetTransferChart", conn)
            {
                CommandType = System.Data.CommandType.StoredProcedure
            };
            await conn.OpenAsync();

            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                result.ByUserDay.Add(new TransferByUserDay
                {
                    Day = (DateTime)reader["day"],
                    User_Id = (int)reader["user_id"],
                    Count = (int)reader["count"]
                });
            }

            if (await reader.NextResultAsync())
            {
                while (await reader.ReadAsync())
                {
                    result.ByUserTotal.Add(new TransferByUserTotal
                    {
                        User_Id = (int)reader["user_id"],
                        Count = (int)reader["count"]
                    });
                }
            }

            if (await reader.NextResultAsync())
            {
                while (await reader.ReadAsync())
                {
                    result.ByDayTotal.Add(new TransferDayTotal
                    {
                        Day = (DateTime)reader["day"],
                        Total_Count = (int)reader["total_count"]
                    });
                }
            }

            return result;
        }
    }
}
