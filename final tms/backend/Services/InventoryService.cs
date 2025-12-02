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
    public class InventoryService : IInventoryService
    {
        private readonly DbClient _dbClient;
        private readonly ILogService _logService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public InventoryService(DbClient dbClient, ILogService logService, IHttpContextAccessor httpContextAccessor)
        {
            _dbClient = dbClient;
            _logService = logService;
            _httpContextAccessor = httpContextAccessor;
        }

        public IEnumerable<InventoryChartItem> GetInventoryChart()
        {
            var list = new List<InventoryChartItem>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetInventoryChart", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            
            while (rdr.Read())
            {
                list.Add(new InventoryChartItem { Count = (int)rdr["count"], EntryDate = (DateTime)rdr["entry_date"] });
            }
            
            if (rdr.NextResult())
                while (rdr.Read())
                    list.Add(new InventoryChartItem { Count = (int)rdr["count"], UserId = (int)rdr["user_id"] });
            
            if (rdr.NextResult())
                while (rdr.Read())
                    list.Add(new InventoryChartItem { Count = (int)rdr["count"], TechId = (int)rdr["tech_id"] });
            
            if (rdr.NextResult())
                while (rdr.Read())
                    list.Add(new InventoryChartItem { Count = (int)rdr["count"], ReasonName = rdr["reason_name"].ToString() });

            return list;
        }

        public IEnumerable<InventoryItemDto> GetInventoryByStatus(int statusId, int PageNumber, int PageSize)
        {
            var list = new List<InventoryItemDto>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetInventoryWithUserNamesByStatus", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@status_id", statusId);
            cmd.Parameters.AddWithValue("@PageNumber", PageNumber);
            cmd.Parameters.AddWithValue("@PageSize", PageSize);
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new InventoryItemDto
                {
                    TerminalId = (int)rdr["terminal_id"],
                    TerminalNumber = rdr["terminal_number"].ToString(),
                    EntryDate = (DateTime)rdr["entry_date"],
                    AltTerminalNumber = rdr["alt_terminal_number"].ToString(),
                    SerialNumber = rdr["serial_number"].ToString(),
                    AltSerialNumber = rdr["alt_serial_number"].ToString(),
                    RejectReason = rdr["reject_reason"].ToString(),
                    TechName = rdr["tech_name"].ToString(),
                    StatusName = rdr["status_name"].ToString(),
                    UserName = rdr["user_name"].ToString(),
                    ReasonName = rdr["reason_name"].ToString()
                });
            }
            return list;
        }

        public void InsertInventory(InventoryCreateDto dto)
        {
            var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("InsertInventory", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@terminal_number", dto.TerminalNumber);
            cmd.Parameters.AddWithValue("@reason_id", dto.ReasonId);
            cmd.Parameters.AddWithValue("@user_id", userId);
            cmd.Parameters.AddWithValue("@alt_terminal_number", dto.AltTerminalNumber);
            cmd.Parameters.AddWithValue("@tech_id", dto.TechId);
            cmd.Parameters.AddWithValue("@serial_number", dto.SerialNumber);
            cmd.Parameters.AddWithValue("@alt_serial_number", dto.AltSerialNumber);
            conn.Open();
            cmd.ExecuteNonQuery();
            var details = $"Action: InsertInventory, Data: {JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "InsertInventory", "inventory", details:details);
        }

        public void UpdateInventory(InventoryUpdateDto dto)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("UpdateInventory", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@terminal_id", dto.TerminalId);
            cmd.Parameters.AddWithValue("@terminal_number", dto.TerminalNumber);
            cmd.Parameters.AddWithValue("@reason_id", dto.ReasonId);
            cmd.Parameters.AddWithValue("@alt_terminal_number", dto.AltTerminalNumber);
            cmd.Parameters.AddWithValue("@tech_id", dto.TechId);
            cmd.Parameters.AddWithValue("@serial_number", dto.SerialNumber);
            cmd.Parameters.AddWithValue("@alt_serial_number", dto.AltSerialNumber);
            cmd.Parameters.AddWithValue("@status_id", dto.StatusId);
            cmd.Parameters.AddWithValue("@reject_reason", dto.RejectReason);
            conn.Open();
            cmd.ExecuteNonQuery();
            var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: UpdateInventory, Data: {JsonSerializer.Serialize(dto)}";
            _logService.InsertLog(userId, "UpdateInventory", "inventory", dto.TerminalId, details);
        }

        public void UpdateInventoryStatus(int terminalId, int statusId, string rejectReason)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("UpdateInventoryStatus", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@id", terminalId);
            cmd.Parameters.AddWithValue("@status_id", statusId);
            cmd.Parameters.AddWithValue("@rejectReson", rejectReason);
            conn.Open();
            cmd.ExecuteNonQuery();
            var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: UpdateInventoryStatus, Data: {JsonSerializer.Serialize(new { terminalId, statusId, rejectReason })}";
            _logService.InsertLog(userId, "UpdateInventoryStatus", "inventory", terminalId, details);
        }

        public void DeleteInventory(int terminalId)
        {
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("DeleteInventory", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@terminal_id", terminalId);
            conn.Open();
            cmd.ExecuteNonQuery();
            var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
            var details = $"Action: DeleteInventory, Data: {{ \"terminalId\": {terminalId} }}";
            _logService.InsertLog(userId, "DeleteInventory", "inventory", terminalId, details);
        }

        public void InsertTechnician(string tech_name)
        {
            var userId = _httpContextAccessor.HttpContext.Session.GetInt32("UserId").Value;
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("InsertTechnician", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.AddWithValue("@tech_name", tech_name);
            cmd.Parameters.AddWithValue("@user_id", userId);
            conn.Open();
            cmd.ExecuteNonQuery();
            var details = $"Action: InsertTechnician, Data: {{ \"tech_name\": {tech_name} }}";
            _logService.InsertLog(userId, "InsertTechnician", "technicians", details:details);
        }
    }
}
