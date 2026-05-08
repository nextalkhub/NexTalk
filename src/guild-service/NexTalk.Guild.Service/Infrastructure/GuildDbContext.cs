using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;

namespace NexTalk.Guild.Service.Infrastructure;

public class GuildDbContext(DbContextOptions<GuildDbContext> options) : DbContext(options)
{
    public DbSet<Guild> Guilds => Set<Guild>();
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<Member> Members => Set<Member>();
    public DbSet<Invite> Invites => Set<Invite>();
    public DbSet<Ban> Bans => Set<Ban>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("guild");

        modelBuilder.Entity<Guild>(e =>
        {
            e.ToTable("guilds");
            e.HasKey(g => g.Id);
            e.Property(g => g.Name).IsRequired().HasMaxLength(100);
            e.Property(g => g.DisplayName).IsRequired().HasMaxLength(200);
            e.HasMany(g => g.Channels).WithOne(c => c.Guild).HasForeignKey(c => c.GuildId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(g => g.Members).WithOne(m => m.Guild).HasForeignKey(m => m.GuildId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(g => g.Invites).WithOne(i => i.Guild).HasForeignKey(i => i.GuildId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(g => g.Bans).WithOne(b => b.Guild).HasForeignKey(b => b.GuildId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Channel>(e =>
        {
            e.ToTable("channels");
            e.HasKey(c => c.Id);
            e.Property(c => c.Name).IsRequired().HasMaxLength(100);
            e.Property(c => c.Type).IsRequired().HasMaxLength(20);
        });

        modelBuilder.Entity<Member>(e =>
        {
            e.ToTable("members");
            e.HasKey(m => m.Id);
            e.HasIndex(m => new { m.GuildId, m.UserId }).IsUnique();
            e.Property(m => m.DisplayName).IsRequired().HasMaxLength(200);
            e.Property(m => m.Username).IsRequired().HasMaxLength(100);
            e.Property(m => m.Role).HasConversion<string>();
        });

        modelBuilder.Entity<Invite>(e =>
        {
            e.ToTable("invites");
            e.HasKey(i => i.Id);
            e.HasIndex(i => i.Code).IsUnique();
            e.Property(i => i.Code).IsRequired().HasMaxLength(20);
        });

        modelBuilder.Entity<Ban>(e =>
        {
            e.ToTable("bans");
            e.HasKey(b => b.Id);
            e.HasIndex(b => new { b.GuildId, b.UserId }).IsUnique();
        });
    }
}
