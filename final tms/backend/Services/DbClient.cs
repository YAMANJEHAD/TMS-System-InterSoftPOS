using System.Data;
using System.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace Backend.Services
{
    public class DbClient
    {
        private readonly string _connectionString;
        public DbClient(IConfiguration config)
        {
            _connectionString = config.GetConnectionString("DefaultConnection");
        }

        public IDbConnection CreateConnection()
        {
            return new SqlConnection(_connectionString);
        }
    }
}
