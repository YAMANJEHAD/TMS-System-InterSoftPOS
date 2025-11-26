using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace Backend.Middlewares
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly string _logFilePath = "ErrorLog.txt"; // path to store errors

        public ExceptionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception ex)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;

            var errorResponse = new
            {
                Message = "An unexpected error occurred.",
                Details = ex.Message
            };

            // Log error to file
            var logText = $"[{DateTime.Now}] {ex.Message}\n{ex.StackTrace}\n\n";
            await File.AppendAllTextAsync(_logFilePath, logText);

            await context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse));
        }
    }
}
