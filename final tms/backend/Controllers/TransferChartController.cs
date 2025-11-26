using Backend.Models;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransferChartController : ControllerBase
    {
        private readonly ITransferChartService _service;

        public TransferChartController(ITransferChartService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetChart()
        {
            var result = await _service.GetTransferChartAsync();
            return Ok(new
            {
                message = "Success",
                data = result
            });
        }
    }
}
