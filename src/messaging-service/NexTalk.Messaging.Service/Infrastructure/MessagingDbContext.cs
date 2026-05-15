using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Domain;

namespace NexTalk.Messaging.Service.Infrastructure;

public class MessagingDbContext(DbContextOptions<MessagingDbContext> options) : DbContext(options)
{
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("messaging");

        modelBuilder.Entity<Message>(e =>
        {
            e.ToTable("messages");
            e.HasKey(m => m.Id);
            e.Property(m => m.AuthorName).IsRequired().HasMaxLength(200);
            e.Property(m => m.Content).IsRequired().HasMaxLength(4000);
            // Composite index supports the cursor query pattern:
            // WHERE channel_id = ? AND id < ? ORDER BY created_at DESC LIMIT N
            e.HasIndex(m => new { m.ChannelId, m.CreatedAt });
        });
    }
}
