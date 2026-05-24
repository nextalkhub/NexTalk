using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain; // provides Channel, Member, Invite, Ban, MemberRole
// CS0118: 'Guild' resolves to the NexTalk.Guild *namespace* via enclosing-namespace lookup
// (C# spec: namespace found in enclosing scope beats using-imported types, and a using alias
// with the same name as an enclosing namespace is also rejected). Use a distinct alias.
using GuildAggregate = global::NexTalk.Guild.Service.Domain.Guild;

namespace NexTalk.Guild.Service.Infrastructure;

public class GuildDbContext : DbContext
{
    public GuildDbContext(DbContextOptions<GuildDbContext> options) : base(options) { }

    public DbSet<GuildAggregate> Guilds => Set<GuildAggregate>();
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<Member> Members => Set<Member>();
    public DbSet<Invite> Invites => Set<Invite>();
    public DbSet<Ban> Bans => Set<Ban>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("guild");

        modelBuilder.Entity<GuildAggregate>(e =>
        {
            e.ToTable("guilds");
            e.HasKey(g => g.Id);
            e.Property(g => g.Id).HasDefaultValueSql("uuidv7()");
            e.Property(g => g.Name).IsRequired().HasMaxLength(32);
            e.Property(g => g.OwnerId).IsRequired().HasMaxLength(36);
            e.Property(g => g.CreatedAt).HasDefaultValueSql("now()");
            e.HasIndex(g => g.OwnerId);
            e.HasMany(g => g.Channels).WithOne(c => c.Guild).HasForeignKey(c => c.GuildId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(g => g.Members).WithOne(m => m.Guild).HasForeignKey(m => m.GuildId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(g => g.Invites).WithOne(i => i.Guild).HasForeignKey(i => i.GuildId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(g => g.Bans).WithOne(b => b.Guild).HasForeignKey(b => b.GuildId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Channel>(e =>
        {
            e.ToTable("channels");
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).HasDefaultValueSql("uuidv7()");
            e.Property(c => c.Name).IsRequired().HasMaxLength(32);
            e.Property(c => c.Type).IsRequired().HasMaxLength(20)
                .HasConversion(v => v.ToString().ToLower(), v => Enum.Parse<ChannelType>(v, true));
            e.Property(c => c.CreatedAt).HasDefaultValueSql("now()");
            e.HasIndex(c => c.GuildId);
        });

        modelBuilder.Entity<Member>(e =>
        {
            e.ToTable("members");
            e.HasKey(m => new { m.GuildId, m.UserId });
            e.Property(m => m.UserId).IsRequired().HasMaxLength(36);
            e.Property(m => m.DisplayName).IsRequired().HasMaxLength(255);
            e.Property(m => m.Username).IsRequired().HasMaxLength(254);
            e.Property(m => m.Role).HasConversion<string>();
            e.Property(m => m.JoinedAt).HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<Invite>(e =>
        {
            e.ToTable("invites");
            e.HasKey(i => i.Id);
            e.Property(i => i.Id).HasDefaultValueSql("uuidv7()");
            e.Property(i => i.Code).IsRequired().HasMaxLength(20);
            e.Property(i => i.CreatedBy).IsRequired().HasMaxLength(36);
            e.Property(i => i.UsesCount).HasDefaultValue(0);
            e.Property(i => i.CreatedAt).HasDefaultValueSql("now()");
            e.HasIndex(i => i.Code).IsUnique();
            e.HasIndex(i => i.GuildId);
        });

        modelBuilder.Entity<Ban>(e =>
        {
            e.ToTable("bans");
            e.HasKey(b => new { b.GuildId, b.UserId });
            e.Property(b => b.UserId).IsRequired().HasMaxLength(36);
            e.Property(b => b.BannedBy).IsRequired().HasMaxLength(36);
            e.Property(b => b.Reason).HasMaxLength(500);
            e.Property(b => b.BannedAt).HasDefaultValueSql("now()");
        });
    }
}
