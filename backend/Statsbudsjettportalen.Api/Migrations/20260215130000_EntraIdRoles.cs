using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Statsbudsjettportalen.Api.Migrations
{
    /// <inheritdoc />
    public partial class EntraIdRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add new columns to Users table
            migrationBuilder.AddColumn<string>(
                name: "JobTitle",
                table: "Users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LeaderLevel",
                table: "Users",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EntraObjectId",
                table: "Users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            // Create UserDepartmentAssignments table
            migrationBuilder.CreateTable(
                name: "UserDepartmentAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserDepartmentAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserDepartmentAssignments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserDepartmentAssignments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserDepartmentAssignments_UserId_DepartmentId",
                table: "UserDepartmentAssignments",
                columns: new[] { "UserId", "DepartmentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserDepartmentAssignments_DepartmentId",
                table: "UserDepartmentAssignments",
                column: "DepartmentId");

            // Rename role values
            migrationBuilder.Sql(@"
                UPDATE ""Users"" SET ""Role"" = 'underdirektor_fag' WHERE ""Role"" = 'leder_fag'
            ");

            migrationBuilder.Sql(@"
                UPDATE ""Users"" SET ""Role"" = 'avdelingsdirektor_fin' WHERE ""Role"" = 'leder_fin'
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert role renames
            migrationBuilder.Sql(@"
                UPDATE ""Users"" SET ""Role"" = 'leder_fag' WHERE ""Role"" = 'underdirektor_fag'
            ");

            migrationBuilder.Sql(@"
                UPDATE ""Users"" SET ""Role"" = 'leder_fin' WHERE ""Role"" = 'avdelingsdirektor_fin'
            ");

            migrationBuilder.DropTable(
                name: "UserDepartmentAssignments");

            migrationBuilder.DropColumn(name: "JobTitle", table: "Users");
            migrationBuilder.DropColumn(name: "LeaderLevel", table: "Users");
            migrationBuilder.DropColumn(name: "EntraObjectId", table: "Users");
        }
    }
}
