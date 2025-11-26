using Backend.Services;
using Backend.Services.Interfaces;
using Backend.Middleware;
using Backend.Middlewares;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

//  Add Services 

// Core services
builder.Services.AddSingleton<DbClient>();

// App services
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IFilterService, FilterService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IJobOrderService, JobOrderService>();
builder.Services.AddScoped<IPaperService, PaperService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ITransferService, TransferService>();
builder.Services.AddScoped<ITransferChartService, TransferChartService>();


// Permissions, Logging, Session
builder.Services.AddHttpContextAccessor();
builder.Services.AddDistributedMemoryCache();

builder.Services.AddSession(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.None; 
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
});



builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<ILogService, LogService>();

// Controllers & Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "OrderService API",
        Version = "v1"
    });
});


// CORS 
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200") // Angular app
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Build app 
var app = builder.Build();

// Middleware 
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "OrderService API v1");
    });
}

// Order matters:
// 1. CORS first
app.UseCors("AllowAngular");

app.UseStaticFiles();

// 2. Session before authentication
app.UseSession();

// 3. Authentication / Authorization
app.UseAuthentication();
app.UseAuthorization();

// 4. Custom middlewares
app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<AuthorizationMiddleware>();

// 5. Map controllers
app.MapControllers();

// Run app 
app.Run();
