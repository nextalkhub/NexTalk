using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Domain;

namespace NexTalk.Messaging.Service.Infrastructure;

public class MessagingDbContext : DbContext
{
    public MessagingDbContext(DbContextOptions<MessagingDbContext> options) : base(options) { }

    public DbSet<Message> Messages => Set<Message>();
    public DbSet<OutboxEvent> OutboxEvents => Set<OutboxEvent>();
    public DbSet<IdempotencyKey> IdempotencyKeys => Set<IdempotencyKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("messaging");

        modelBuilder.Entity<Message>(e =>
        {
            e.ToTable("messages");
            e.HasKey(m => m.Id);
            e.Property(m => m.Id).HasColumnName("id").HasDefaultValueSql("uuidv7()");
            e.Property(m => m.ChannelId).HasColumnName("channel_id").IsRequired();
            e.Property(m => m.GuildId).HasColumnName("guild_id").IsRequired();
            e.Property(m => m.AuthorId).HasColumnName("author_id").IsRequired().HasMaxLength(36);
            e.Property(m => m.AuthorName).HasColumnName("author_name").IsRequired().HasMaxLength(32);
            e.Property(m => m.Content).HasColumnName("content").IsRequired().HasMaxLength(4000);
            e.Property(m => m.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

            e.HasIndex(m => new { m.ChannelId, m.CreatedAt }).HasDatabaseName("ix_messages_channel_id_created_at");
        });

        modelBuilder.Entity<OutboxEvent>(e =>
        {
            e.ToTable("outbox_events");
            e.HasKey(o => o.Id);
            e.Property(o => o.Id).HasColumnName("id").HasDefaultValueSql("uuidv7()");
            e.Property(o => o.EventType).HasColumnName("event_type").IsRequired().HasMaxLength(64);
            e.Property(o => o.GuildId).HasColumnName("guild_id").IsRequired();
            e.Property(o => o.Payload).HasColumnName("payload").IsRequired();
            e.Property(o => o.PublishedAt).HasColumnName("published_at");
            e.Property(o => o.ProcessedAt).HasColumnName("processed_at");
            e.Property(o => o.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

            e.HasIndex(o => new { o.PublishedAt, o.CreatedAt })
                .HasDatabaseName("ix_outbox_events_pending")
                .HasFilter("processed_at IS NULL");
        });

        modelBuilder.Entity<IdempotencyKey>(e =>
        {
            e.ToTable("idempotency_keys");
            e.HasKey(k => k.Key);
            e.Property(k => k.Key).HasColumnName("key").HasMaxLength(128);
            e.Property(k => k.Response).HasColumnName("response").IsRequired();
            e.Property(k => k.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Property(k => k.ExpiresAt).HasColumnName("expires_at").IsRequired();
        });
    }
}
