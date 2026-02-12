using Microsoft.EntityFrameworkCore;
using Statsbudsjettportalen.Api.Models;

namespace Statsbudsjettportalen.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<User> Users => Set<User>();
    public DbSet<BudgetRound> BudgetRounds => Set<BudgetRound>();
    public DbSet<Case> Cases => Set<Case>();
    public DbSet<CaseContent> CaseContents => Set<CaseContent>();
    public DbSet<CaseEvent> CaseEvents => Set<CaseEvent>();
    public DbSet<Clearance> Clearances => Set<Clearance>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<SubmissionCase> SubmissionCases => Set<SubmissionCase>();
    public DbSet<Attachment> Attachments => Set<Attachment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Composite key for junction table
        modelBuilder.Entity<SubmissionCase>()
            .HasKey(sc => new { sc.SubmissionId, sc.CaseId });

        modelBuilder.Entity<SubmissionCase>()
            .HasOne(sc => sc.Submission)
            .WithMany(s => s.SubmissionCases)
            .HasForeignKey(sc => sc.SubmissionId);

        modelBuilder.Entity<SubmissionCase>()
            .HasOne(sc => sc.Case)
            .WithMany()
            .HasForeignKey(sc => sc.CaseId);

        // Case relationships
        modelBuilder.Entity<Case>()
            .HasOne(c => c.BudgetRound)
            .WithMany(br => br.Cases)
            .HasForeignKey(c => c.BudgetRoundId);

        modelBuilder.Entity<Case>()
            .HasOne(c => c.Department)
            .WithMany(d => d.Cases)
            .HasForeignKey(c => c.DepartmentId);

        modelBuilder.Entity<CaseContent>()
            .HasOne(cc => cc.Case)
            .WithMany(c => c.ContentVersions)
            .HasForeignKey(cc => cc.CaseId);

        modelBuilder.Entity<CaseEvent>()
            .HasOne(ce => ce.Case)
            .WithMany(c => c.Events)
            .HasForeignKey(ce => ce.CaseId);

        modelBuilder.Entity<Question>()
            .HasOne(q => q.Case)
            .WithMany(c => c.Questions)
            .HasForeignKey(q => q.CaseId);

        modelBuilder.Entity<Clearance>()
            .HasOne(cl => cl.Case)
            .WithMany(c => c.Clearances)
            .HasForeignKey(cl => cl.CaseId);

        // Indexes
        modelBuilder.Entity<Case>()
            .HasIndex(c => new { c.BudgetRoundId, c.DepartmentId });

        modelBuilder.Entity<Case>()
            .HasIndex(c => c.Status);

        modelBuilder.Entity<CaseContent>()
            .HasIndex(cc => new { cc.CaseId, cc.Version })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Department>()
            .HasIndex(d => d.Code)
            .IsUnique();

        // Seed data
        SeedData.Seed(modelBuilder);
    }
}
