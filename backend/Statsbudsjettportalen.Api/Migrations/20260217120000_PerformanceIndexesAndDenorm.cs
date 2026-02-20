using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Statsbudsjettportalen.Api.Data;

#nullable disable

namespace Statsbudsjettportalen.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260217120000_PerformanceIndexesAndDenorm")]
    public class PerformanceIndexesAndDenorm : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add LatestContentId column to Cases table (nullable FK to CaseContents.Id)
            migrationBuilder.Sql(@"
                ALTER TABLE ""Cases""
                ADD COLUMN ""LatestContentId"" uuid NULL
                    REFERENCES ""CaseContents""(""Id"");
            ");

            // 2. Backfill LatestContentId for existing data
            migrationBuilder.Sql(@"
                UPDATE ""Cases"" c
                SET ""LatestContentId"" = sub.""Id""
                FROM (
                    SELECT DISTINCT ON (""CaseId"") ""Id"", ""CaseId""
                    FROM ""CaseContents""
                    ORDER BY ""CaseId"", ""Version"" DESC
                ) sub
                WHERE c.""Id"" = sub.""CaseId"";
            ");

            // 3. Index for quickly finding the latest content version per case
            migrationBuilder.Sql(@"
                CREATE INDEX idx_case_content_latest
                ON ""CaseContents"" (""CaseId"", ""Version"" DESC);
            ");

            // 4. Covering index for case list queries filtered by department and budget round
            migrationBuilder.Sql(@"
                CREATE INDEX idx_cases_dept_round
                ON ""Cases"" (""DepartmentId"", ""BudgetRoundId"")
                INCLUDE (""CaseName"", ""Chapter"", ""Post"", ""Amount"", ""Status"", ""CaseType"", ""AssignedTo"");
            ");

            // 5. Index for case event timeline queries
            migrationBuilder.Sql(@"
                CREATE INDEX idx_case_events_case_time
                ON ""CaseEvents"" (""CaseId"", ""CreatedAt"" DESC);
            ");

            // 6. Index for resource lock lookups by resource
            migrationBuilder.Sql(@"
                CREATE INDEX idx_resource_locks_resource
                ON ""ResourceLocks"" (""ResourceType"", ""ResourceId"");
            ");

            // 7. Index for department list case entry ordering within sections
            migrationBuilder.Sql(@"
                CREATE INDEX idx_deplist_entries_section
                ON ""DepartmentListCaseEntries"" (""DepartmentListId"", ""SectionId"", ""SortOrder"");
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS idx_deplist_entries_section;");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS idx_resource_locks_resource;");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS idx_case_events_case_time;");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS idx_cases_dept_round;");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS idx_case_content_latest;");

            migrationBuilder.Sql(@"
                ALTER TABLE ""Cases"" DROP COLUMN IF EXISTS ""LatestContentId"";
            ");
        }
    }
}
