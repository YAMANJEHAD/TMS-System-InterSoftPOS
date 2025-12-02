using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Models;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace Backend.Services
{
    public class TransferService : ITransferService
    {
        private readonly DbClient _dbClient;
        private readonly ILogService _logService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public TransferService(DbClient dbClient, ILogService logService, IHttpContextAccessor httpContextAccessor)
        {
            _dbClient = dbClient;
            _logService = logService;
            _httpContextAccessor = httpContextAccessor;
        }

        public IEnumerable<TransferTicketDto> GetAllTransferTicket(DateTime? fromDate, DateTime? toDate, int? ticketNo, int? duplicateCount, int? terminalNumber, int? userId, int PageNumber, int PageSize)
        {
            var list = new List<TransferTicketDto>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetAllTransferTicket", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure

            };
            cmd.Parameters.AddWithValue("@fromDate", (object)fromDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@toDate", (object)toDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ticket_no", (object)ticketNo ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@DuplicateCount", (object)duplicateCount ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@terminal_number", (object)terminalNumber ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@user_id", (object)userId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@PageNumber", PageNumber);
            cmd.Parameters.AddWithValue("@PageSize", PageSize);
            cmd.CommandTimeout = 180;

            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new TransferTicketDto
                {
                    Id = (int)rdr["id"],
                    TerminalNumber = rdr["terminal_number"].ToString(),
                    CreatedAt = (DateTime)rdr["created_at"],
                    UserName = rdr["name"].ToString(),
                    TicketNo = rdr["ticket_no"].ToString(),
                    RejectReason = rdr["reject_reason"].ToString(),
                    FromTech = rdr["from_tech"].ToString(),
                    ToTech = rdr["to_tech"].ToString(),
                    StatusName = rdr["status_name"].ToString(),
                    DuplicateCount = (int)rdr["DuplicateCount"]
                    

                });
            }
            return list;
        }

        public void InsertTransferTicketNew(TransferCreateDto dto)
        {
            var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("InsertTransferTicketNew", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@terminal_number", dto.TerminalNumber);
            cmd.Parameters.AddWithValue("@user_id", userId);
            cmd.Parameters.AddWithValue("@ticket_no", dto.TicketNo);
            cmd.Parameters.AddWithValue("@from_tech_id", dto.FromTechId);
            cmd.Parameters.AddWithValue("@to_tech_id", dto.ToTechId);
            conn.Open();
            cmd.ExecuteNonQuery();
            var details = $"Action: InsertTransferTicketNew, Data: {JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "InsertTransferTicketNew", "transfertickets", details: details);
        }

        public void UpdateTransferTicket(TransferUpdateDto dto)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("UpdateTransferTicket", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@id", dto.Id);
            cmd.Parameters.AddWithValue("@terminal_number", dto.TerminalNumber);
            cmd.Parameters.AddWithValue("@ticket_no", dto.TicketNo);
            cmd.Parameters.AddWithValue("@reject_reason", dto.RejectReason);
            cmd.Parameters.AddWithValue("@from_tech_id", dto.FromTechId);
            cmd.Parameters.AddWithValue("@to_tech_id", dto.ToTechId);
            cmd.Parameters.AddWithValue("@status_id", dto.StatusId);
            conn.Open();
            cmd.ExecuteNonQuery();
            var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: UpdateTransferTicket, Data: {JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "UpdateTransferTicket", "transfertickets", dto.Id, details);
        }

        //public void UpdateTransferTicketStatus(int id, int statusId, string rejectReason)
        //{
        //    using var conn = _dbClient.CreateConnection();
        //    using var cmd = new SqlCommand("UpdateTransferTicketStatus", (SqlConnection)conn)
        //    {
        //        CommandType = CommandType.StoredProcedure
        //    };
        //    cmd.Parameters.AddWithValue("@status_id", statusId);
        //    cmd.Parameters.AddWithValue("@reject_reason", rejectReason);
        //    conn.Open();
        //    cmd.ExecuteNonQuery();
        //    var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
        //    var details = $"Action: UpdateTransferTicketStatus, Data: {JsonSerializer.Serialize(new { id, statusId, rejectReason })}";
        //    _logService.InsertLog(userId, "UpdateTransferTicketStatus", "transfertickets", id, details);
        //}

        public void UpdateTicketStatus(int id, int statusId, string rejectReason)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("UpdateTicketStatus", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@id", id);
            cmd.Parameters.AddWithValue("@status_id", statusId);
            cmd.Parameters.AddWithValue("@rejectReson", rejectReason);
            conn.Open();
            cmd.ExecuteNonQuery();
        }

        public void DeleteTransferTicket(int id)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("DeleteTransferTicket", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@id", id);
            conn.Open();
            cmd.ExecuteNonQuery();
            var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: DeleteTransferTicket, Data: {{ \"id\": {id} }}";
            _logService.InsertLog(userId, "DeleteTransferTicket", "transfertickets", id, details);
        }
    }
}
