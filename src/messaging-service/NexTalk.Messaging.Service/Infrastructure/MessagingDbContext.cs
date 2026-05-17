using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Domain;

namespace NexTalk.Messaging.Service.Infrastructure;

public class MessagingDbContext(DbContextOptions<MessagingDbContext> options) : DbContext(options)
{
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<OutboxEvent> OutboxEvents => Set<OutboxEvent>();
    public DbSet<IdempotencyKey> IdempotencyKeys => Set<IdempotencyKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("messaging");

        modelBuilder.Entity<Message>(e =>
        {
            e.HasKey(m => m.Id);
            e.Property(m => m.ChannelId).IsRequired();
            e.Property(m => m.GuildId).IsRequired();
            e.Property(m => m.AuthorId).IsRequired();
            e.Property(m => m.AuthorName).IsRequired().HasMaxLength(100);
            e.Property(m => m.Content).IsRequired().HasMaxLength(4000);
            e.Property(m => m.CreatedAt).IsRequired();

            // Cursor-based pagination
            e.HasIndex(m => new { m.ChannelId, m.CreatedAt });
        });

        modelBuilder.Entity<OutboxEvent>(e =>
        {
            e.HasKey(o => o.Id);
            e.Property(o => o.EventType).IsRequired().HasMaxLength(100);
            e.Property(o => o.GuildId).IsRequired();
            e.Property(o => o.Payload).IsRequired();
            e.Property(o => o.CreatedAt).IsRequired();

            // OutboxWorker запрашивает необработанные события, отсортированные по времени создания.
            e.HasIndex(o => new { o.Processed, o.PublishedAt, o.CreatedAt });
        });

        modelBuilder.Entity<IdempotencyKey>(e =>
        {
            e.HasKey(k => k.Key);
            e.Property(k => k.Key).HasMaxLength(128);
            e.Property(k => k.Response).IsRequired();
            e.Property(k => k.CreatedAt).IsRequired();
            e.Property(k => k.ExpiresAt).IsRequired();
        });
    }
}
