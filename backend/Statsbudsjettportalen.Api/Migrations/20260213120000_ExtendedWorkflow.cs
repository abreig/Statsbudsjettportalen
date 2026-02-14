using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Statsbudsjettportalen.Api.Migrations
{
    /// <inheritdoc />
    public partial class ExtendedWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // User: add Division and Section
            migrationBuilder.AddColumn<string>(
                name: "Division",
                table: "Users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "Users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            // Case: add ResponsibleDivision
            migrationBuilder.AddColumn<string>(
                name: "ResponsibleDivision",
                table: "Cases",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            // BudgetRound: add ClosedAt
            migrationBuilder.AddColumn<DateTime>(
                name: "ClosedAt",
                table: "BudgetRounds",
                type: "timestamp with time zone",
                nullable: true);

            // New table: CaseOpinions (uttalelse)
            migrationBuilder.CreateTable(
                name: "CaseOpinions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedTo = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    OpinionText = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseOpinions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CaseOpinions_Cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "Cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CaseOpinions_CaseId",
                table: "CaseOpinions",
                column: "CaseId");

            // New table: RoundFieldOverrides (per-round FIN field config)
            migrationBuilder.CreateTable(
                name: "RoundFieldOverrides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BudgetRoundId = table.Column<Guid>(type: "uuid", nullable: false),
                    CaseTypeCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FinFieldKeysJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoundFieldOverrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoundFieldOverrides_BudgetRounds_BudgetRoundId",
                        column: x => x.BudgetRoundId,
                        principalTable: "BudgetRounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoundFieldOverrides_BudgetRoundId_CaseTypeCode",
                table: "RoundFieldOverrides",
                columns: new[] { "BudgetRoundId", "CaseTypeCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "RoundFieldOverrides");
            migrationBuilder.DropTable(name: "CaseOpinions");

            migrationBuilder.DropColumn(name: "ClosedAt", table: "BudgetRounds");
            migrationBuilder.DropColumn(name: "ResponsibleDivision", table: "Cases");
            migrationBuilder.DropColumn(name: "Section", table: "Users");
            migrationBuilder.DropColumn(name: "Division", table: "Users");
        }
    }
}
