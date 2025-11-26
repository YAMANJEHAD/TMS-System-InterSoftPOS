using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Backend.Middleware
{
    public class AuthorizationMiddleware
    {
        private readonly RequestDelegate _next;
        public AuthorizationMiddleware(RequestDelegate next) => _next = next;

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value.ToLower();

            
            if (path.StartsWith("/api/auth/login"))
            {
                await _next(context);
                return;
            }

            
            //if (context.Request.Headers.ContainsKey("Origin") &&
            //    context.Request.Headers["Origin"].ToString().Contains("localhost:4200"))
            //{
            //    await _next(context);
            //    return;
            //}

            
            var userId = context.Session.GetInt32("UserId");
            if (!userId.HasValue)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }

            await _next(context);
        }
    }
}
