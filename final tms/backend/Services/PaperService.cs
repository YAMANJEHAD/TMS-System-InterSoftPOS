using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Models;
using Backend.Services.Interfaces;

namespace Backend.Services
{
    public class PaperService : IPaperService
    {
        private readonly DbClient _dbClient;
        public PaperService(DbClient dbClient) => _dbClient = dbClient;

        public IEnumerable<CancelledPaperDto> GetPaper(DateTime? fromDate, DateTime? toDate, int? entryUser)
        {
            var list = new List<CancelledPaperDto>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetPaper", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@fromDate", (object)fromDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@toDate", (object)toDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@entryUser", (object)entryUser ?? DBNull.Value);
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new CancelledPaperDto
                {
                    Id = (int)rdr["id"],
                    CancelledTerminalNo = rdr["cancelled_terminal_no"].ToString(),
                    DeliveredTerminalNo = rdr["delivered_terminal_no"].ToString(),
                    EntryUser = rdr["entry_user"].ToString(),
                    EntryDate = (DateTime)rdr["entry_date"],
                    CancelledTicketNo = rdr["cancelled_ticket_no"].ToString(),
                    DeliveredTicketNo = rdr["delivered_ticket_no"].ToString()
                });
            }
            return list;
        }

        public void InsertPaper(CancelledPaperCreateDto dto, int EntryUser)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("InsertPaper", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@cancelled_terminal_no", dto.CancelledTerminalNo);
            cmd.Parameters.AddWithValue("@delivered_terminal_no", dto.DeliveredTerminalNo);
            cmd.Parameters.AddWithValue("@entry_user", EntryUser);
            cmd.Parameters.AddWithValue("@cancelled_ticket_no", dto.CancelledTicketNo);
            cmd.Parameters.AddWithValue("@delivered_ticket_no", dto.DeliveredTicketNo);
            conn.Open();
            cmd.ExecuteNonQuery();
        }

        public void UpdatePaper(CancelledPaperUpdateDto dto)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("UpdatePaper", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@id", dto.Id);
            cmd.Parameters.AddWithValue("@cancelled_terminal_no", dto.CancelledTerminalNo);
            cmd.Parameters.AddWithValue("@delivered_terminal_no", dto.DeliveredTerminalNo);
            cmd.Parameters.AddWithValue("@cancelled_ticket_no", dto.CancelledTicketNo);
            cmd.Parameters.AddWithValue("@delivered_ticket_no", dto.DeliveredTicketNo);
            conn.Open();
            cmd.ExecuteNonQuery();
        }

        public void DeletePaper(int id)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("DeletePaper", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@id", id);
            conn.Open();
            cmd.ExecuteNonQuery();
        }
    }
}
