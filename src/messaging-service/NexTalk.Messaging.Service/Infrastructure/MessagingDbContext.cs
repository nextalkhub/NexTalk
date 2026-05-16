using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Domain;

namespace NexTalk.Messaging.Service.Infrastructure;

public partial class MessagingDbContext(DbContextOptions<MessagingDbContext> options) : DbContext(options)
{
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("messaging");

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).IsRequired();
            entity.HasIndex(e => new { e.ChannelId, e.CreatedAt });
        });
    }
}
