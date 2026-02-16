using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Statsbudsjettportalen.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAmountFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "FinAmount",
                table: "Cases",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "GovAmount",
                table: "Cases",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "FinAmount",
                table: "CaseContents",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "GovAmount",
                table: "CaseContents",
                type: "bigint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "FinAmount", table: "Cases");
            migrationBuilder.DropColumn(name: "GovAmount", table: "Cases");
            migrationBuilder.DropColumn(name: "FinAmount", table: "CaseContents");
            migrationBuilder.DropColumn(name: "GovAmount", table: "CaseContents");
        }
    }
}
