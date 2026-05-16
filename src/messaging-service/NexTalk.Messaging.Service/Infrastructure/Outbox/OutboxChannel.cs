using System.Threading.Channels;
using NexTalk.Messaging.Service.Domain;

namespace NexTalk.Messaging.Service.Infrastructure.Outbox;

/// <summary>
/// Внутрипроцессный ограниченный канал между OutboxWorker (продюсер) и BroadcastConsumer (консюмер).
/// Bounded(100): если консюмер отстаёт, воркер блокируется вместо бесконтрольного накопления.
/// </summary>
public sealed class OutboxChannel
{
    private readonly Channel<OutboxEvent> _channel =
        Channel.CreateBounded<OutboxEvent>(new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleWriter = true,
            SingleReader = true,
        });

    public ChannelWriter<OutboxEvent> Writer => _channel.Writer;
    public ChannelReader<OutboxEvent> Reader => _channel.Reader;
}
