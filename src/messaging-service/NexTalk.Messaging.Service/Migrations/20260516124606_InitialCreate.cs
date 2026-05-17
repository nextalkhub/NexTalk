using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexTalk.Messaging.Service.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "messaging");

            migrationBuilder.CreateTable(
                name: "IdempotencyKeys",
                schema: "messaging",
                columns: table => new
                {
                    Key = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Response = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IdempotencyKeys", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "Messages",
                schema: "messaging",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChannelId = table.Column<Guid>(type: "uuid", nullable: false),
                    GuildId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Content = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Messages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OutboxEvents",
                schema: "messaging",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    GuildId = table.Column<Guid>(type: "uuid", nullable: false),
                    Payload = table.Column<string>(type: "text", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Processed = table.Column<bool>(type: "boolean", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxEvents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ChannelId_CreatedAt",
                schema: "messaging",
                table: "Messages",
                columns: new[] { "ChannelId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxEvents_Processed_PublishedAt_CreatedAt",
                schema: "messaging",
                table: "OutboxEvents",
                columns: new[] { "Processed", "PublishedAt", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IdempotencyKeys",
                schema: "messaging");

            migrationBuilder.DropTable(
                name: "Messages",
                schema: "messaging");

            migrationBuilder.DropTable(
                name: "OutboxEvents",
                schema: "messaging");
        }
    }
}
