using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Statsbudsjettportalen.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartmentListTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // CaseConclusions table
            migrationBuilder.CreateTable(
                name: "CaseConclusions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseConclusions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CaseConclusions_Cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "Cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CaseConclusions_CaseId",
                table: "CaseConclusions",
                column: "CaseId");

            // DepartmentListTemplates table
            migrationBuilder.CreateTable(
                name: "DepartmentListTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BudgetRoundType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DepartmentNamePlaceholder = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ClassificationText = table.Column<string>(type: "text", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentListTemplates", x => x.Id);
                });

            // DepartmentListTemplateSections table
            migrationBuilder.CreateTable(
                name: "DepartmentListTemplateSections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: true),
                    TitleTemplate = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    HeadingStyle = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    SectionType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Config = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentListTemplateSections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DepartmentListTemplateSections_DepartmentListTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "DepartmentListTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentListTemplateSections_DepartmentListTemplateSections_ParentId",
                        column: x => x.ParentId,
                        principalTable: "DepartmentListTemplateSections",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentListTemplateSections_TemplateId_SortOrder",
                table: "DepartmentListTemplateSections",
                columns: new[] { "TemplateId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentListTemplateSections_ParentId",
                table: "DepartmentListTemplateSections",
                column: "ParentId");

            // DepartmentLists table
            migrationBuilder.CreateTable(
                name: "DepartmentLists",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    BudgetRoundId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentLists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DepartmentLists_DepartmentListTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "DepartmentListTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentLists_BudgetRounds_BudgetRoundId",
                        column: x => x.BudgetRoundId,
                        principalTable: "BudgetRounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentLists_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentLists_BudgetRoundId_DepartmentId",
                table: "DepartmentLists",
                columns: new[] { "BudgetRoundId", "DepartmentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentLists_TemplateId",
                table: "DepartmentLists",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentLists_DepartmentId",
                table: "DepartmentLists",
                column: "DepartmentId");

            // DepartmentListSections table
            migrationBuilder.CreateTable(
                name: "DepartmentListSections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentListId = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateSectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    ContentJson = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentListSections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DepartmentListSections_DepartmentLists_DepartmentListId",
                        column: x => x.DepartmentListId,
                        principalTable: "DepartmentLists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentListSections_DepartmentListTemplateSections_TemplateSectionId",
                        column: x => x.TemplateSectionId,
                        principalTable: "DepartmentListTemplateSections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentListSections_DepartmentListSections_ParentId",
                        column: x => x.ParentId,
                        principalTable: "DepartmentListSections",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentListSections_DepartmentListId",
                table: "DepartmentListSections",
                column: "DepartmentListId");

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentListSections_TemplateSectionId",
                table: "DepartmentListSections",
                column: "TemplateSectionId");

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentListSections_ParentId",
                table: "DepartmentListSections",
                column: "ParentId");

            // DepartmentListCaseEntries table
            migrationBuilder.CreateTable(
                name: "DepartmentListCaseEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentListId = table.Column<Guid>(type: "uuid", nullable: false),
                    SectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Subgroup = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    OverrideContent = table.Column<string>(type: "jsonb", nullable: true),
                    IncludedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentListCaseEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DepartmentListCaseEntries_DepartmentLists_DepartmentListId",
                        column: x => x.DepartmentListId,
                        principalTable: "DepartmentLists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentListCaseEntries_DepartmentListSections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "DepartmentListSections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentListCaseEntries_Cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "Cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentListCaseEntries_DepartmentListId_CaseId",
                table: "DepartmentListCaseEntries",
                columns: new[] { "DepartmentListId", "CaseId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentListCaseEntries_SectionId",
                table: "DepartmentListCaseEntries",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentListCaseEntries_CaseId",
                table: "DepartmentListCaseEntries",
                column: "CaseId");

            // DepartmentListFigures table
            migrationBuilder.CreateTable(
                name: "DepartmentListFigures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentListId = table.Column<Guid>(type: "uuid", nullable: false),
                    SectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FileType = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Caption = table.Column<string>(type: "text", nullable: true),
                    WidthPercent = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    UploadedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentListFigures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DepartmentListFigures_DepartmentLists_DepartmentListId",
                        column: x => x.DepartmentListId,
                        principalTable: "DepartmentLists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepartmentListFigures_DepartmentListSections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "DepartmentListSections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentListFigures_DepartmentListId",
                table: "DepartmentListFigures",
                column: "DepartmentListId");

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentListFigures_SectionId",
                table: "DepartmentListFigures",
                column: "SectionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "DepartmentListFigures");
            migrationBuilder.DropTable(name: "DepartmentListCaseEntries");
            migrationBuilder.DropTable(name: "DepartmentListSections");
            migrationBuilder.DropTable(name: "DepartmentLists");
            migrationBuilder.DropTable(name: "DepartmentListTemplateSections");
            migrationBuilder.DropTable(name: "DepartmentListTemplates");
            migrationBuilder.DropTable(name: "CaseConclusions");
        }
    }
}
