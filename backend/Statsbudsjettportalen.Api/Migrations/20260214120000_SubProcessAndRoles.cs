using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Statsbudsjettportalen.Api.Migrations
{
    /// <inheritdoc />
    public partial class SubProcessAndRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // CaseOpinions: add Type column
            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "CaseOpinions",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "uttalelse");

            // CaseOpinions: add ForwardedFromId (self-reference for delegation chain)
            migrationBuilder.AddColumn<Guid>(
                name: "ForwardedFromId",
                table: "CaseOpinions",
                type: "uuid",
                nullable: true);

            // CaseOpinions: add OriginalOpinionId (root of forwarding chain)
            migrationBuilder.AddColumn<Guid>(
                name: "OriginalOpinionId",
                table: "CaseOpinions",
                type: "uuid",
                nullable: true);

            // Indexes for efficient queries
            migrationBuilder.CreateIndex(
                name: "IX_CaseOpinions_AssignedTo",
                table: "CaseOpinions",
                column: "AssignedTo");

            migrationBuilder.CreateIndex(
                name: "IX_CaseOpinions_Type",
                table: "CaseOpinions",
                column: "Type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_CaseOpinions_Type", table: "CaseOpinions");
            migrationBuilder.DropIndex(name: "IX_CaseOpinions_AssignedTo", table: "CaseOpinions");
            migrationBuilder.DropColumn(name: "OriginalOpinionId", table: "CaseOpinions");
            migrationBuilder.DropColumn(name: "ForwardedFromId", table: "CaseOpinions");
            migrationBuilder.DropColumn(name: "Type", table: "CaseOpinions");
        }
    }
}
