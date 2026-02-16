using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Statsbudsjettportalen.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAnswerJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AnswerJson",
                table: "Questions",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "AnswerJson", table: "Questions");
        }
    }
}
