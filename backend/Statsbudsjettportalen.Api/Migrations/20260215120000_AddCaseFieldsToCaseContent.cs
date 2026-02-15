using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Statsbudsjettportalen.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCaseFieldsToCaseContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CaseName",
                table: "CaseContents",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Chapter",
                table: "CaseContents",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Post",
                table: "CaseContents",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Amount",
                table: "CaseContents",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "CaseContents",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            // Backfill existing content versions with current case-level values
            migrationBuilder.Sql(@"
                UPDATE ""CaseContents"" cc
                SET ""Chapter"" = c.""Chapter"",
                    ""Post"" = c.""Post"",
                    ""Amount"" = c.""Amount"",
                    ""CaseName"" = c.""CaseName"",
                    ""Status"" = c.""Status""
                FROM ""Cases"" c
                WHERE cc.""CaseId"" = c.""Id""
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "CaseName", table: "CaseContents");
            migrationBuilder.DropColumn(name: "Chapter", table: "CaseContents");
            migrationBuilder.DropColumn(name: "Post", table: "CaseContents");
            migrationBuilder.DropColumn(name: "Amount", table: "CaseContents");
            migrationBuilder.DropColumn(name: "Status", table: "CaseContents");
        }
    }
}
