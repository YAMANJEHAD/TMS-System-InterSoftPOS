using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using Backend.Models;
using Backend.Services.Interfaces;

namespace Backend.Services
{
    public class FilterService : IFilterService
    {
        private readonly DbClient _dbClient;
        public FilterService(DbClient dbClient) => _dbClient = dbClient;

        public IEnumerable<PriorityDto> GetPriorityForFilter()
        {
            var list = new List<PriorityDto>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetPriorityForFilter", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new PriorityDto
                {
                    PriorityId = (int)rdr["priority_id"],
                    PriorityName = rdr["priority_name"].ToString()
                });
            }
            return list;
        }

        public IEnumerable<ProjectDto> GetProjectForFilter()
        {
            var list = new List<ProjectDto>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetProjectForFilter", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new ProjectDto
                {
                    ProjectId = (int)rdr["project_id"],
                    Name = rdr["name"].ToString()
                });
            }
            return list;
        }

        public IEnumerable<ReasonDto> GetReasonForFilter()
        {
            var list = new List<ReasonDto>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetReasonForFilter", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new ReasonDto
                {
                    ReasonId = (int)rdr["reason_id"],
                    ReasonName = rdr["reason_name"].ToString()
                });
            }
            return list;
        }

        public IEnumerable<StatusDto> GetStatusForFilter()
        {
            var list = new List<StatusDto>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetStatusForFilter", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new StatusDto
                {
                    StatusId = (int)rdr["status_id"],
                    StatusName = rdr["status_name"].ToString()
                });
            }
            return list;
        }

        public IEnumerable<TechnicianDto> GetTechniciansForFilter()
        {
            var list = new List<TechnicianDto>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetTechniciansForFilter", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new TechnicianDto
                {
                    TechId = (int)rdr["tech_id"],
                    TechName = rdr["tech_name"].ToString()
                });
            }
            return list;
        }

        public IEnumerable<UserFilterDto> GetUsersForFilter()
        {
            var list = new List<UserFilterDto>();
            using var conn = _dbClient.CreateConnection();
            using var cmd = new SqlCommand("GetUsersForFilter", (SqlConnection)conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            conn.Open();
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                list.Add(new UserFilterDto
                {
                    UserId = (int)rdr["user_id"],
                    Name = rdr["name"].ToString()
                });
            }
            return list;
        }
    }
}
