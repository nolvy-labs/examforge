using System;

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamForge.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_questions_ExamSectionId_ParentQuestionId_DisplayOrder",
                schema: "examforge",
                table: "questions");

            migrationBuilder.DropIndex(
                name: "IX_questions_ParentQuestionId",
                schema: "examforge",
                table: "questions");

            migrationBuilder.DropIndex(
                name: "IX_fill_answer_keys_QuestionId_BlankKey_DisplayOrder",
                schema: "examforge",
                table: "fill_answer_keys");

            migrationBuilder.AlterColumn<string>(
                name: "Prompt",
                schema: "examforge",
                table: "questions",
                type: "character varying(20000)",
                maxLength: 20000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<decimal>(
                name: "Points",
                schema: "examforge",
                table: "questions",
                type: "numeric(8,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(8,2)",
                oldDefaultValue: 1m);

            migrationBuilder.AlterColumn<string>(
                name: "Explanation",
                schema: "examforge",
                table: "questions",
                type: "character varying(20000)",
                maxLength: 20000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Text",
                schema: "examforge",
                table: "question_options",
                type: "character varying(10000)",
                maxLength: 10000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<bool>(
                name: "IsCorrect",
                schema: "examforge",
                table: "question_options",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "Explanation",
                schema: "examforge",
                table: "question_options",
                type: "character varying(10000)",
                maxLength: 10000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "NormalizedAnswer",
                schema: "examforge",
                table: "fill_answer_keys",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<bool>(
                name: "IsCaseSensitive",
                schema: "examforge",
                table: "fill_answer_keys",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "BlankKey",
                schema: "examforge",
                table: "fill_answer_keys",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldDefaultValue: "answer");

            migrationBuilder.AlterColumn<string>(
                name: "AcceptedAnswer",
                schema: "examforge",
                table: "fill_answer_keys",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAtUtc",
                schema: "examforge",
                table: "fill_answer_keys",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ux_questions_child_order",
                schema: "examforge",
                table: "questions",
                columns: new[] { "ParentQuestionId", "DisplayOrder" },
                unique: true,
                filter: "\"ParentQuestionId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ux_questions_top_level_order",
                schema: "examforge",
                table: "questions",
                columns: new[] { "ExamSectionId", "DisplayOrder" },
                unique: true,
                filter: "\"ParentQuestionId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_fill_answer_keys_QuestionId_DisplayOrder",
                schema: "examforge",
                table: "fill_answer_keys",
                columns: new[] { "QuestionId", "DisplayOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_questions_child_order",
                schema: "examforge",
                table: "questions");

            migrationBuilder.DropIndex(
                name: "ux_questions_top_level_order",
                schema: "examforge",
                table: "questions");

            migrationBuilder.DropIndex(
                name: "IX_fill_answer_keys_QuestionId_DisplayOrder",
                schema: "examforge",
                table: "fill_answer_keys");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                schema: "examforge",
                table: "fill_answer_keys");

            migrationBuilder.AlterColumn<string>(
                name: "Prompt",
                schema: "examforge",
                table: "questions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20000)",
                oldMaxLength: 20000);

            migrationBuilder.AlterColumn<decimal>(
                name: "Points",
                schema: "examforge",
                table: "questions",
                type: "numeric(8,2)",
                nullable: false,
                defaultValue: 1m,
                oldClrType: typeof(decimal),
                oldType: "numeric(8,2)");

            migrationBuilder.AlterColumn<string>(
                name: "Explanation",
                schema: "examforge",
                table: "questions",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20000)",
                oldMaxLength: 20000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Text",
                schema: "examforge",
                table: "question_options",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(10000)",
                oldMaxLength: 10000);

            migrationBuilder.AlterColumn<bool>(
                name: "IsCorrect",
                schema: "examforge",
                table: "question_options",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "Explanation",
                schema: "examforge",
                table: "question_options",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(10000)",
                oldMaxLength: 10000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "NormalizedAnswer",
                schema: "examforge",
                table: "fill_answer_keys",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<bool>(
                name: "IsCaseSensitive",
                schema: "examforge",
                table: "fill_answer_keys",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "BlankKey",
                schema: "examforge",
                table: "fill_answer_keys",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "answer",
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "AcceptedAnswer",
                schema: "examforge",
                table: "fill_answer_keys",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000);

            migrationBuilder.CreateIndex(
                name: "IX_questions_ExamSectionId_ParentQuestionId_DisplayOrder",
                schema: "examforge",
                table: "questions",
                columns: new[] { "ExamSectionId", "ParentQuestionId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_questions_ParentQuestionId",
                schema: "examforge",
                table: "questions",
                column: "ParentQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_fill_answer_keys_QuestionId_BlankKey_DisplayOrder",
                schema: "examforge",
                table: "fill_answer_keys",
                columns: new[] { "QuestionId", "BlankKey", "DisplayOrder" });
        }
    }
}