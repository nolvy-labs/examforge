using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamForge.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExamSectionManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_questions_questions_ParentQuestionId",
                schema: "examforge",
                table: "questions");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                schema: "examforge",
                table: "exam_sections",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "StimulusText",
                schema: "examforge",
                table: "exam_sections",
                type: "character varying(50000)",
                maxLength: 50000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Instructions",
                schema: "examforge",
                table: "exam_sections",
                type: "character varying(10000)",
                maxLength: 10000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "FK_questions_questions_ParentQuestionId",
                schema: "examforge",
                table: "questions",
                column: "ParentQuestionId",
                principalSchema: "examforge",
                principalTable: "questions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_questions_questions_ParentQuestionId",
                schema: "examforge",
                table: "questions");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                schema: "examforge",
                table: "exam_sections",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "StimulusText",
                schema: "examforge",
                table: "exam_sections",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50000)",
                oldMaxLength: 50000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Instructions",
                schema: "examforge",
                table: "exam_sections",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(10000)",
                oldMaxLength: 10000);

            migrationBuilder.AddForeignKey(
                name: "FK_questions_questions_ParentQuestionId",
                schema: "examforge",
                table: "questions",
                column: "ParentQuestionId",
                principalSchema: "examforge",
                principalTable: "questions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}