using Backend.Models;

public interface ITransferChartService
{
    Task<TransferChartResponseDto> GetTransferChartAsync();
}
