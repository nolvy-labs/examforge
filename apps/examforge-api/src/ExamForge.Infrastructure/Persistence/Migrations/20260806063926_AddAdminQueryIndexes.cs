using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamForge.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminQueryIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_exam_attempts_ExamId",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.CreateIndex(
                name: "ix_users_created_at_id",
                schema: "examforge",
                table: "users",
                columns: new[] { "CreatedAtUtc", "Id" });

            migrationBuilder.CreateIndex(
                name: "ix_exam_attempts_exam_created_at_id",
                schema: "examforge",
                table: "exam_attempts",
                columns: new[] { "ExamId", "CreatedAtUtc", "Id" });

            migrationBuilder.CreateIndex(
                name: "ix_exam_attempts_status_expires_at_id",
                schema: "examforge",
                table: "exam_attempts",
                columns: new[] { "Status", "ExpiresAtUtc", "Id" });

            migrationBuilder.CreateIndex(
                name: "ix_exam_attempts_student_created_at_id",
                schema: "examforge",
                table: "exam_attempts",
                columns: new[] { "StudentId", "CreatedAtUtc", "Id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_users_created_at_id",
                schema: "examforge",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ix_exam_attempts_exam_created_at_id",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropIndex(
                name: "ix_exam_attempts_status_expires_at_id",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.DropIndex(
                name: "ix_exam_attempts_student_created_at_id",
                schema: "examforge",
                table: "exam_attempts");

            migrationBuilder.CreateIndex(
                name: "IX_exam_attempts_ExamId",
                schema: "examforge",
                table: "exam_attempts",
                column: "ExamId");
        }
    }
}