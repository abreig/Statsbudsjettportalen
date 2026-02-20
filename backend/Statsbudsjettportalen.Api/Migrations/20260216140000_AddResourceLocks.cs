using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Statsbudsjettportalen.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddResourceLocks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FinListPlacement",
                table: "Cases",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PriorityNumber",
                table: "Cases",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ResourceLocks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ResourceType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ResourceId = table.Column<Guid>(type: "uuid", nullable: false),
                    LockedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    LockedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastHeartbeat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResourceLocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResourceLocks_Users_LockedBy",
                        column: x => x.LockedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResourceLocks_ExpiresAt",
                table: "ResourceLocks",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceLocks_LockedBy",
                table: "ResourceLocks",
                column: "LockedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceLocks_ResourceType_ResourceId",
                table: "ResourceLocks",
                columns: new[] { "ResourceType", "ResourceId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResourceLocks");

            migrationBuilder.DropColumn(name: "FinListPlacement", table: "Cases");
            migrationBuilder.DropColumn(name: "PriorityNumber", table: "Cases");
        }
    }
}
