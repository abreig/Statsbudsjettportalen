using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace Statsbudsjettportalen.Api.Services;

/// <summary>
/// Thin wrapper around IDistributedCache for typed get/set with JSON serialization.
/// </summary>
public class CacheService
{
    private readonly IDistributedCache _cache;

    public CacheService(IDistributedCache cache) => _cache = cache;

    public async Task<T?> GetAsync<T>(string key)
    {
        var data = await _cache.GetStringAsync(key);
        if (data == null) return default;
        return JsonSerializer.Deserialize<T>(data);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan ttl)
    {
        var json = JsonSerializer.Serialize(value);
        await _cache.SetStringAsync(key, json, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = ttl,
        });
    }

    public async Task RemoveAsync(string key) => await _cache.RemoveAsync(key);

    public async Task InvalidateByPrefixAsync(string prefix)
    {
        // Note: IDistributedCache doesn't support prefix deletion natively.
        // For Redis, this would use SCAN + DEL. For now, we invalidate known keys explicitly.
        // In production, use StackExchange.Redis directly for pattern-based invalidation.
        await Task.CompletedTask;
    }
}
