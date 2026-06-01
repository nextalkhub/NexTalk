using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexTalk.Guild.Service.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class BanDisplayName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "display_name",
                schema: "guild",
                table: "bans",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "username",
                schema: "guild",
                table: "bans",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "display_name",
                schema: "guild",
                table: "bans");

            migrationBuilder.DropColumn(
                name: "username",
                schema: "guild",
                table: "bans");
        }
    }
}
