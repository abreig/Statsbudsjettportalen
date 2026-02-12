using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Statsbudsjettportalen.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BudgetRounds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Deadline = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BudgetRounds", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Departments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Cases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BudgetRoundId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    CaseName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Chapter = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Post = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Amount = table.Column<long>(type: "bigint", nullable: true),
                    CaseType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    AssignedTo = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    Origin = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cases_BudgetRounds_BudgetRoundId",
                        column: x => x.BudgetRoundId,
                        principalTable: "BudgetRounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Cases_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Submissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BudgetRoundId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmittedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    IsSupplement = table.Column<bool>(type: "boolean", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Submissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Submissions_BudgetRounds_BudgetRoundId",
                        column: x => x.BudgetRoundId,
                        principalTable: "BudgetRounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Submissions_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Attachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FilePath = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: true),
                    MimeType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    UploadedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Attachments_Cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "Cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CaseContents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    ProposalText = table.Column<string>(type: "text", nullable: true),
                    Justification = table.Column<string>(type: "text", nullable: true),
                    VerbalConclusion = table.Column<string>(type: "text", nullable: true),
                    SocioeconomicAnalysis = table.Column<string>(type: "text", nullable: true),
                    GoalIndicator = table.Column<string>(type: "text", nullable: true),
                    BenefitPlan = table.Column<string>(type: "text", nullable: true),
                    Comment = table.Column<string>(type: "text", nullable: true),
                    FinAssessment = table.Column<string>(type: "text", nullable: true),
                    FinVerbal = table.Column<string>(type: "text", nullable: true),
                    FinRConclusion = table.Column<string>(type: "text", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseContents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CaseContents_Cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "Cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CaseEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    EventData = table.Column<string>(type: "jsonb", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CaseEvents_Cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "Cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Clearances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedTo = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Comment = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clearances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clearances_Cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "Cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Questions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    AskedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionText = table.Column<string>(type: "text", nullable: false),
                    AnswerText = table.Column<string>(type: "text", nullable: true),
                    AnsweredBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AnsweredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Questions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Questions_Cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "Cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SubmissionCases",
                columns: table => new
                {
                    SubmissionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CaseId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubmissionCases", x => new { x.SubmissionId, x.CaseId });
                    table.ForeignKey(
                        name: "FK_SubmissionCases_Cases_CaseId",
                        column: x => x.CaseId,
                        principalTable: "Cases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SubmissionCases_Submissions_SubmissionId",
                        column: x => x.SubmissionId,
                        principalTable: "Submissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "BudgetRounds",
                columns: new[] { "Id", "Deadline", "Name", "Status", "Type", "Year" },
                values: new object[,]
                {
                    { new Guid("30000000-0000-0000-0000-000000000001"), new DateTime(2026, 8, 15, 23, 59, 59, 0, DateTimeKind.Utc), "AUG2026", "open", "august", 2026 },
                    { new Guid("30000000-0000-0000-0000-000000000002"), new DateTime(2026, 3, 1, 23, 59, 59, 0, DateTimeKind.Utc), "MARS2026", "open", "mars", 2026 }
                });

            migrationBuilder.InsertData(
                table: "Departments",
                columns: new[] { "Id", "Code", "Name" },
                values: new object[,]
                {
                    { new Guid("10000000-0000-0000-0000-000000000001"), "KLD", "Klima- og miljødepartementet" },
                    { new Guid("10000000-0000-0000-0000-000000000002"), "FIN", "Finansdepartementet" }
                });

            migrationBuilder.InsertData(
                table: "Cases",
                columns: new[] { "Id", "Amount", "AssignedTo", "BudgetRoundId", "CaseName", "CaseType", "Chapter", "CreatedAt", "CreatedBy", "DepartmentId", "Origin", "Post", "Status", "UpdatedAt", "Version" },
                values: new object[,]
                {
                    { new Guid("40000000-0000-0000-0000-000000000001"), 150000L, new Guid("20000000-0000-0000-0000-000000000003"), new Guid("30000000-0000-0000-0000-000000000001"), "Økt bevilgning til Enova", "satsingsforslag", "1428", new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), new Guid("20000000-0000-0000-0000-000000000001"), new Guid("10000000-0000-0000-0000-000000000001"), "fag", "50", "sendt_til_fin", new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { new Guid("40000000-0000-0000-0000-000000000002"), 50000L, new Guid("20000000-0000-0000-0000-000000000001"), new Guid("30000000-0000-0000-0000-000000000001"), "Midler til opprydding i forurenset sjøbunn", "budsjettiltak", "1420", new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), new Guid("20000000-0000-0000-0000-000000000001"), new Guid("10000000-0000-0000-0000-000000000001"), "fag", "69", "under_arbeid", new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { new Guid("40000000-0000-0000-0000-000000000003"), 200000L, new Guid("20000000-0000-0000-0000-000000000002"), new Guid("30000000-0000-0000-0000-000000000001"), "Styrking av Norges bidrag til Det grønne klimafondet (GCF)", "satsingsforslag", "1482", new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), new Guid("20000000-0000-0000-0000-000000000001"), new Guid("10000000-0000-0000-0000-000000000001"), "fag", "73", "klarert", new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), 1 },
                    { new Guid("40000000-0000-0000-0000-000000000004"), -30000L, new Guid("20000000-0000-0000-0000-000000000001"), new Guid("30000000-0000-0000-0000-000000000001"), "Reduksjon i tilskudd til miljøteknologiordningen", "teknisk_justering", "1428", new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), new Guid("20000000-0000-0000-0000-000000000001"), new Guid("10000000-0000-0000-0000-000000000001"), "fag", "72", "draft", new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), 1 }
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "DepartmentId", "Email", "FullName", "IsActive", "Role" },
                values: new object[,]
                {
                    { new Guid("20000000-0000-0000-0000-000000000001"), new Guid("10000000-0000-0000-0000-000000000001"), "fag.kld@test.no", "Kari Nordmann", true, "saksbehandler_fag" },
                    { new Guid("20000000-0000-0000-0000-000000000002"), new Guid("10000000-0000-0000-0000-000000000001"), "budsjett.kld@test.no", "Ole Hansen", true, "budsjettenhet_fag" },
                    { new Guid("20000000-0000-0000-0000-000000000003"), new Guid("10000000-0000-0000-0000-000000000002"), "fin.kld@test.no", "Eva Johansen", true, "saksbehandler_fin" },
                    { new Guid("20000000-0000-0000-0000-000000000004"), new Guid("10000000-0000-0000-0000-000000000002"), "undirdir.fin@test.no", "Per Olsen", true, "underdirektor_fin" },
                    { new Guid("20000000-0000-0000-0000-000000000005"), new Guid("10000000-0000-0000-0000-000000000002"), "admin@test.no", "Admin Bruker", true, "administrator" }
                });

            migrationBuilder.InsertData(
                table: "CaseContents",
                columns: new[] { "Id", "BenefitPlan", "CaseId", "Comment", "CreatedAt", "CreatedBy", "FinAssessment", "FinRConclusion", "FinVerbal", "GoalIndicator", "Justification", "ProposalText", "SocioeconomicAnalysis", "VerbalConclusion", "Version" },
                values: new object[,]
                {
                    { new Guid("50000000-0000-0000-0000-000000000001"), "Kort sikt (1-2 år): Økt prosjektaktivitet. Mellomlang sikt (3-5 år): Reduksjon i energiforbruk. Lang sikt (5+ år): Varig reduksjon i utslipp.", new Guid("40000000-0000-0000-0000-000000000001"), "Sjekk tallgrunnlag mot Enovas siste årsrapport.", new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), new Guid("20000000-0000-0000-0000-000000000001"), null, null, null, "Reduserte klimagassutslipp under innsatsfordelingen", "Industrien står for en betydelig andel av Norges samlede klimagassutslipp. Flere aktører har meldt prosjekter som kan gi store utslippskutt, men mangler lønnsomhet uten støtte.", "Styrke Enovas arbeid med energieffektivisering i industrien for å redusere klimagassutslipp.", "Tiltaket forventes å gi en kostnad på om lag 800-1000 kroner per tonn redusert CO2-ekvivalent.", "Det varsles i Prop. 1 S at regjeringen tar sikte på å legge frem en opptrappingsplan for energieffektivisering innen 2050.", 1 },
                    { new Guid("50000000-0000-0000-0000-000000000002"), null, new Guid("40000000-0000-0000-0000-000000000002"), null, new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), new Guid("20000000-0000-0000-0000-000000000001"), null, null, null, null, "Flere havneområder har dokumentert forurensning som påvirker marint miljø og folkehelse.", "Bevilge midler til opprydding av forurenset sjøbunn i prioriterte havneområder.", null, null, 1 },
                    { new Guid("50000000-0000-0000-0000-000000000003"), "Årlig rapportering gjennom GCFs resultatrammeverk.", new Guid("40000000-0000-0000-0000-000000000003"), null, new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), new Guid("20000000-0000-0000-0000-000000000001"), null, null, null, "Økt internasjonal klimafinansiering", "Norge har forpliktet seg til økt klimafinansiering gjennom Parisavtalen.", "Øke Norges bidrag til Det grønne klimafondet for å styrke internasjonal klimafinansiering.", "Investeringen forventes å gi betydelig avkastning i form av global utslippsreduksjon.", "Regjeringen foreslår å øke bidraget til GCF som del av Norges internasjonale klimainnsats.", 1 },
                    { new Guid("50000000-0000-0000-0000-000000000004"), null, new Guid("40000000-0000-0000-0000-000000000004"), null, new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), new Guid("20000000-0000-0000-0000-000000000001"), null, null, null, null, "Tilpasning til faktisk forbruksmønster.", "Teknisk justering av bevilgningen til miljøteknologiordningen.", null, null, 1 }
                });

            migrationBuilder.InsertData(
                table: "CaseEvents",
                columns: new[] { "Id", "CaseId", "CreatedAt", "EventData", "EventType", "UserId" },
                values: new object[,]
                {
                    { new Guid("60000000-0000-0000-0000-000000000001"), new Guid("40000000-0000-0000-0000-000000000001"), new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), "{\"case_name\":\"Økt bevilgning til Enova\"}", "created", new Guid("20000000-0000-0000-0000-000000000001") },
                    { new Guid("60000000-0000-0000-0000-000000000002"), new Guid("40000000-0000-0000-0000-000000000002"), new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), "{\"case_name\":\"Midler til opprydding i forurenset sjøbunn\"}", "created", new Guid("20000000-0000-0000-0000-000000000001") },
                    { new Guid("60000000-0000-0000-0000-000000000003"), new Guid("40000000-0000-0000-0000-000000000003"), new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), "{\"case_name\":\"Styrking av Norges bidrag til Det grønne klimafondet (GCF)\"}", "created", new Guid("20000000-0000-0000-0000-000000000001") },
                    { new Guid("60000000-0000-0000-0000-000000000004"), new Guid("40000000-0000-0000-0000-000000000004"), new DateTime(2026, 1, 15, 10, 0, 0, 0, DateTimeKind.Utc), "{\"case_name\":\"Reduksjon i tilskudd til miljøteknologiordningen\"}", "created", new Guid("20000000-0000-0000-0000-000000000001") }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_CaseId",
                table: "Attachments",
                column: "CaseId");

            migrationBuilder.CreateIndex(
                name: "IX_CaseContents_CaseId_Version",
                table: "CaseContents",
                columns: new[] { "CaseId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CaseEvents_CaseId",
                table: "CaseEvents",
                column: "CaseId");

            migrationBuilder.CreateIndex(
                name: "IX_Cases_BudgetRoundId_DepartmentId",
                table: "Cases",
                columns: new[] { "BudgetRoundId", "DepartmentId" });

            migrationBuilder.CreateIndex(
                name: "IX_Cases_DepartmentId",
                table: "Cases",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Cases_Status",
                table: "Cases",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Clearances_CaseId",
                table: "Clearances",
                column: "CaseId");

            migrationBuilder.CreateIndex(
                name: "IX_Departments_Code",
                table: "Departments",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Questions_CaseId",
                table: "Questions",
                column: "CaseId");

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionCases_CaseId",
                table: "SubmissionCases",
                column: "CaseId");

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_BudgetRoundId",
                table: "Submissions",
                column: "BudgetRoundId");

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_DepartmentId",
                table: "Submissions",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_DepartmentId",
                table: "Users",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Attachments");

            migrationBuilder.DropTable(
                name: "CaseContents");

            migrationBuilder.DropTable(
                name: "CaseEvents");

            migrationBuilder.DropTable(
                name: "Clearances");

            migrationBuilder.DropTable(
                name: "Questions");

            migrationBuilder.DropTable(
                name: "SubmissionCases");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Cases");

            migrationBuilder.DropTable(
                name: "Submissions");

            migrationBuilder.DropTable(
                name: "BudgetRounds");

            migrationBuilder.DropTable(
                name: "Departments");
        }
    }
}
