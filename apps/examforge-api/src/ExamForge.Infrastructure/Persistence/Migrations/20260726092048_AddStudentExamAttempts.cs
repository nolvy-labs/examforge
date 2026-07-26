using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamForge.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentExamAttempts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_exam_attempts_users_UserId",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropIndex(
                name: "IX_exam_attempts_ExamId_UserId",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropIndex(
                name: "IX_exam_attempts_UserId_StartedAtUtc",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.RenameColumn(
                name: "UserId",
                schema: "examforge",
                table: "exam_attempts",
                newName: "StudentId");

            migrationBuilder.RenameColumn(
                name: "TotalScore",
                schema: "examforge",
                table: "exam_attempts",
                newName: "Score");

            migrationBuilder.RenameColumn(
                name: "MaxScore",
                schema: "examforge",
                table: "exam_attempts",
                newName: "MaximumScore");

            migrationBuilder.RenameColumn(
                name: "Score",
                schema: "examforge",
                table: "exam_attempt_answers",
                newName: "AwardedScore");

            migrationBuilder.Sql(
                """
                UPDATE examforge.exam_attempts
                SET "UpdatedAtUtc" = COALESCE("SubmittedAtUtc", "StartedAtUtc", "CreatedAtUtc")
                WHERE "UpdatedAtUtc" IS NULL;
                """);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "UpdatedAtUtc",
                schema: "examforge",
                table: "exam_attempts",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Score",
                schema: "examforge",
                table: "exam_attempts",
                type: "numeric(18,6)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(8,2)",
                oldNullable: true,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "MaximumScore",
                schema: "examforge",
                table: "exam_attempts",
                type: "numeric(18,6)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(8,2)",
                oldNullable: true,
                oldDefaultValue: 0m);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AbandonedAtUtc",
                schema: "examforge",
                table: "exam_attempts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ExpiresAtUtc",
                schema: "examforge",
                table: "exam_attempts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Revision",
                schema: "examforge",
                table: "exam_attempts",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            migrationBuilder.AlterColumn<string>(
                name: "TextAnswer",
                schema: "examforge",
                table: "exam_attempt_answers",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "AwardedScore",
                schema: "examforge",
                table: "exam_attempt_answers",
                type: "numeric(18,6)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(8,2)",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GradingStatus",
                schema: "examforge",
                table: "exam_attempt_answers",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE examforge.exam_attempt_answers
                SET "GradingStatus" = CASE
                    WHEN "IsCorrect" = TRUE THEN 'Correct'
                    WHEN "IsCorrect" = FALSE THEN 'Incorrect'
                    ELSE NULL
                END;
                """);

            migrationBuilder.DropColumn(
                name: "IsCorrect",
                schema: "examforge",
                table: "exam_attempt_answers");

            migrationBuilder.AddColumn<decimal>(
                name: "MaximumScore",
                schema: "examforge",
                table: "exam_attempt_answers",
                type: "numeric(18,6)",
                nullable: true);

            migrationBuilder.Sql(
                """
                WITH ranked AS (
                    SELECT "Id",
                           ROW_NUMBER() OVER (
                               PARTITION BY "StudentId", "ExamId"
                               ORDER BY "StartedAtUtc" DESC, "Id" DESC) AS row_number
                    FROM examforge.exam_attempts
                    WHERE "Status" = 'InProgress'
                )
                UPDATE examforge.exam_attempts AS attempt
                SET "Status" = 'Abandoned',
                    "AbandonedAtUtc" = attempt."UpdatedAtUtc",
                    "Score" = NULL,
                    "MaximumScore" = NULL
                FROM ranked
                WHERE attempt."Id" = ranked."Id"
                  AND ranked.row_number > 1;

                UPDATE examforge.exam_attempts
                SET "AbandonedAtUtc" = "UpdatedAtUtc"
                WHERE "Status" = 'Abandoned'
                  AND "AbandonedAtUtc" IS NULL;

                UPDATE examforge.exam_attempts
                SET "Score" = NULL,
                    "MaximumScore" = NULL
                WHERE "Status" <> 'Submitted';

                UPDATE examforge.exam_attempt_answers AS answer
                SET "MaximumScore" = question."Points",
                    "GradingStatus" = COALESCE(answer."GradingStatus", 'Unanswered')
                FROM examforge.exam_attempts AS attempt,
                     examforge.questions AS question
                WHERE answer."ExamAttemptId" = attempt."Id"
                  AND answer."QuestionId" = question."Id"
                  AND attempt."Status" = 'Submitted';

                UPDATE examforge.exam_attempt_answers AS answer
                SET "AwardedScore" = NULL,
                    "MaximumScore" = NULL,
                    "GradingStatus" = NULL
                FROM examforge.exam_attempts AS attempt
                WHERE answer."ExamAttemptId" = attempt."Id"
                  AND attempt."Status" <> 'Submitted';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_exam_attempts_ExamId",
                schema: "examforge",
                table: "exam_attempts",
                column: "ExamId");

            migrationBuilder.CreateIndex(
                name: "ix_exam_attempts_student_status_history",
                schema: "examforge",
                table: "exam_attempts",
                columns: new[] { "StudentId", "Status", "UpdatedAtUtc", "Id" });

            migrationBuilder.CreateIndex(
                name: "ux_exam_attempts_one_in_progress",
                schema: "examforge",
                table: "exam_attempts",
                columns: new[] { "StudentId", "ExamId" },
                unique: true,
                filter: "\"Status\" = 'InProgress'");

            migrationBuilder.AddForeignKey(
                name: "FK_exam_attempts_users_StudentId",
                schema: "examforge",
                table: "exam_attempts",
                column: "StudentId",
                principalSchema: "examforge",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_exam_attempts_users_StudentId",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropIndex(
                name: "IX_exam_attempts_ExamId",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropIndex(
                name: "ix_exam_attempts_student_status_history",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropIndex(
                name: "ux_exam_attempts_one_in_progress",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropColumn(
                name: "AbandonedAtUtc",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropColumn(
                name: "ExpiresAtUtc",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropColumn(
                name: "Revision",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropColumn(
                name: "MaximumScore",
                schema: "examforge",
                table: "exam_attempt_answers");

            migrationBuilder.AddColumn<bool>(
                name: "IsCorrect",
                schema: "examforge",
                table: "exam_attempt_answers",
                type: "boolean",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE examforge.exam_attempt_answers
                SET "IsCorrect" = CASE
                    WHEN "GradingStatus" = 'Correct' THEN TRUE
                    WHEN "GradingStatus" IN ('Incorrect', 'PartiallyCorrect') THEN FALSE
                    ELSE NULL
                END;
                """);

            migrationBuilder.DropColumn(
                name: "GradingStatus",
                schema: "examforge",
                table: "exam_attempt_answers");

            migrationBuilder.RenameColumn(
                name: "StudentId",
                schema: "examforge",
                table: "exam_attempts",
                newName: "UserId");

            migrationBuilder.RenameColumn(
                name: "Score",
                schema: "examforge",
                table: "exam_attempts",
                newName: "TotalScore");

            migrationBuilder.RenameColumn(
                name: "MaximumScore",
                schema: "examforge",
                table: "exam_attempts",
                newName: "MaxScore");

            migrationBuilder.RenameColumn(
                name: "AwardedScore",
                schema: "examforge",
                table: "exam_attempt_answers",
                newName: "Score");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAtUtc",
                schema: "examforge",
                table: "exam_attempts",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<decimal>(
                name: "MaxScore",
                schema: "examforge",
                table: "exam_attempts",
                type: "numeric(8,2)",
                nullable: true,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "TotalScore",
                schema: "examforge",
                table: "exam_attempts",
                type: "numeric(8,2)",
                nullable: true,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "TextAnswer",
                schema: "examforge",
                table: "exam_attempt_answers",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Score",
                schema: "examforge",
                table: "exam_attempt_answers",
                type: "numeric(8,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_exam_attempts_ExamId_UserId",
                schema: "examforge",
                table: "exam_attempts",
                columns: new[] { "ExamId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_exam_attempts_UserId_StartedAtUtc",
                schema: "examforge",
                table: "exam_attempts",
                columns: new[] { "UserId", "StartedAtUtc" });

            migrationBuilder.AddForeignKey(
                name: "FK_exam_attempts_users_UserId",
                schema: "examforge",
                table: "exam_attempts",
                column: "UserId",
                principalSchema: "examforge",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
