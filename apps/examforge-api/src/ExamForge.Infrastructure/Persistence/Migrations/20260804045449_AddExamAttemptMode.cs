using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamForge.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExamAttemptMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_exam_attempts_one_in_progress",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.AddColumn<string>(
                name: "Mode",
                schema: "examforge",
                table: "exam_attempts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE examforge.exam_attempts
                SET "Mode" = CASE
                    WHEN "ExpiresAtUtc" IS NOT NULL THEN 'Exam'
                    ELSE 'Practice'
                END;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Mode",
                schema: "examforge",
                table: "exam_attempts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "ux_exam_attempts_one_in_progress",
                schema: "examforge",
                table: "exam_attempts",
                columns: new[] { "StudentId", "ExamVersionId" },
                unique: true,
                filter: "\"Status\" = 'InProgress'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_exam_attempts_one_in_progress",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropColumn(
                name: "Mode",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.CreateIndex(
                name: "ux_exam_attempts_one_in_progress",
                schema: "examforge",
                table: "exam_attempts",
                columns: new[] { "StudentId", "ExamId" },
                unique: true,
                filter: "\"Status\" = 'InProgress'");
        }
    }
}