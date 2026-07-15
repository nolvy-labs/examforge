using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamForge.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExamVersionControl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "NextVersionNumber",
                schema: "examforge",
                table: "exams",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.Sql(
                """
                UPDATE examforge.exams AS exam
                SET "NextVersionNumber" =
                    (
                        SELECT LEAST(
                            COALESCE(MAX(version."VersionNumber"::bigint) + 1, 1),
                            2147483647)::integer
                        FROM examforge.exam_versions AS version
                        WHERE version."ExamId" = exam."Id"
                    );
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                schema: "examforge",
                table: "exam_versions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "Instructions",
                schema: "examforge",
                table: "exam_versions",
                type: "character varying(10000)",
                maxLength: 10000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "examforge",
                table: "exam_versions",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_exam_versions_CreatedByUserId",
                schema: "examforge",
                table: "exam_versions",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_exam_versions_ExamId_CreatedAtUtc_Id",
                schema: "examforge",
                table: "exam_versions",
                columns: new[] { "ExamId", "CreatedAtUtc", "Id" });

            migrationBuilder.AddForeignKey(
                name: "FK_exam_versions_users_CreatedByUserId",
                schema: "examforge",
                table: "exam_versions",
                column: "CreatedByUserId",
                principalSchema: "examforge",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_exam_versions_users_CreatedByUserId",
                schema: "examforge",
                table: "exam_versions");

            migrationBuilder.DropIndex(
                name: "IX_exam_versions_CreatedByUserId",
                schema: "examforge",
                table: "exam_versions");

            migrationBuilder.DropIndex(
                name: "IX_exam_versions_ExamId_CreatedAtUtc_Id",
                schema: "examforge",
                table: "exam_versions");

            migrationBuilder.DropColumn(
                name: "NextVersionNumber",
                schema: "examforge",
                table: "exams");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                schema: "examforge",
                table: "exam_versions",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "Instructions",
                schema: "examforge",
                table: "exam_versions",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(10000)",
                oldMaxLength: 10000);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "examforge",
                table: "exam_versions",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000);
        }
    }
}