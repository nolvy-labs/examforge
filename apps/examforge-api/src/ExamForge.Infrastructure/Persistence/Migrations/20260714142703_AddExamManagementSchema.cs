using System;

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamForge.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExamManagementSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "exams",
                schema: "examforge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "character varying(220)", maxLength: 220, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exams", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "exam_tag_mappings",
                schema: "examforge",
                columns: table => new
                {
                    ExamId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExamTagId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exam_tag_mappings", x => new { x.ExamId, x.ExamTagId });
                    table.ForeignKey(
                        name: "FK_exam_tag_mappings_exam_tags_ExamTagId",
                        column: x => x.ExamTagId,
                        principalSchema: "examforge",
                        principalTable: "exam_tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_exam_tag_mappings_exams_ExamId",
                        column: x => x.ExamId,
                        principalSchema: "examforge",
                        principalTable: "exams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "exam_versions",
                schema: "examforge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExamId = table.Column<Guid>(type: "uuid", nullable: false),
                    VersionNumber = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false, defaultValue: ""),
                    Instructions = table.Column<string>(type: "text", nullable: false, defaultValue: ""),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: true),
                    TotalScore = table.Column<decimal>(type: "numeric(8,2)", nullable: false, defaultValue: 0m),
                    PublishedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RetiredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exam_versions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_exam_versions_exams_ExamId",
                        column: x => x.ExamId,
                        principalSchema: "examforge",
                        principalTable: "exams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "exam_attempts",
                schema: "examforge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExamId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExamVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    StartedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TotalScore = table.Column<decimal>(type: "numeric(8,2)", nullable: true, defaultValue: 0m),
                    MaxScore = table.Column<decimal>(type: "numeric(8,2)", nullable: true, defaultValue: 0m),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exam_attempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_exam_attempts_exam_versions_ExamVersionId",
                        column: x => x.ExamVersionId,
                        principalSchema: "examforge",
                        principalTable: "exam_versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_exam_attempts_exams_ExamId",
                        column: x => x.ExamId,
                        principalSchema: "examforge",
                        principalTable: "exams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_exam_attempts_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "examforge",
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "exam_sections",
                schema: "examforge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExamVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false, defaultValue: ""),
                    Instructions = table.Column<string>(type: "text", nullable: false, defaultValue: ""),
                    StimulusText = table.Column<string>(type: "text", nullable: true),
                    MediaUrl = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    MetadataJson = table.Column<string>(type: "jsonb", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exam_sections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_exam_sections_exam_versions_ExamVersionId",
                        column: x => x.ExamVersionId,
                        principalSchema: "examforge",
                        principalTable: "exam_versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "questions",
                schema: "examforge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExamSectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentQuestionId = table.Column<Guid>(type: "uuid", nullable: true),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Prompt = table.Column<string>(type: "text", nullable: false),
                    Explanation = table.Column<string>(type: "text", nullable: true),
                    Points = table.Column<decimal>(type: "numeric(8,2)", nullable: false, defaultValue: 1m),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    MetadataJson = table.Column<string>(type: "jsonb", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_questions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_questions_exam_sections_ExamSectionId",
                        column: x => x.ExamSectionId,
                        principalSchema: "examforge",
                        principalTable: "exam_sections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_questions_questions_ParentQuestionId",
                        column: x => x.ParentQuestionId,
                        principalSchema: "examforge",
                        principalTable: "questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "exam_attempt_answers",
                schema: "examforge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExamAttemptId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    TextAnswer = table.Column<string>(type: "text", nullable: true),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: true),
                    Score = table.Column<decimal>(type: "numeric(8,2)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exam_attempt_answers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_exam_attempt_answers_exam_attempts_ExamAttemptId",
                        column: x => x.ExamAttemptId,
                        principalSchema: "examforge",
                        principalTable: "exam_attempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_exam_attempt_answers_questions_QuestionId",
                        column: x => x.QuestionId,
                        principalSchema: "examforge",
                        principalTable: "questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "fill_answer_keys",
                schema: "examforge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    BlankKey = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false, defaultValue: "answer"),
                    AcceptedAnswer = table.Column<string>(type: "text", nullable: false),
                    NormalizedAnswer = table.Column<string>(type: "text", nullable: false),
                    IsCaseSensitive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fill_answer_keys", x => x.Id);
                    table.ForeignKey(
                        name: "FK_fill_answer_keys_questions_QuestionId",
                        column: x => x.QuestionId,
                        principalSchema: "examforge",
                        principalTable: "questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "question_options",
                schema: "examforge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Text = table.Column<string>(type: "text", nullable: false),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    Explanation = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_question_options", x => x.Id);
                    table.ForeignKey(
                        name: "FK_question_options_questions_QuestionId",
                        column: x => x.QuestionId,
                        principalSchema: "examforge",
                        principalTable: "questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "exam_attempt_selected_options",
                schema: "examforge",
                columns: table => new
                {
                    ExamAttemptAnswerId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionOptionId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exam_attempt_selected_options", x => new { x.ExamAttemptAnswerId, x.QuestionOptionId });
                    table.ForeignKey(
                        name: "FK_exam_attempt_selected_options_exam_attempt_answers_ExamAtte~",
                        column: x => x.ExamAttemptAnswerId,
                        principalSchema: "examforge",
                        principalTable: "exam_attempt_answers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_exam_attempt_selected_options_question_options_QuestionOpti~",
                        column: x => x.QuestionOptionId,
                        principalSchema: "examforge",
                        principalTable: "question_options",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_exam_attempt_answers_ExamAttemptId_QuestionId",
                schema: "examforge",
                table: "exam_attempt_answers",
                columns: new[] { "ExamAttemptId", "QuestionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_exam_attempt_answers_QuestionId",
                schema: "examforge",
                table: "exam_attempt_answers",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_exam_attempt_selected_options_QuestionOptionId",
                schema: "examforge",
                table: "exam_attempt_selected_options",
                column: "QuestionOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_exam_attempts_ExamId_UserId",
                schema: "examforge",
                table: "exam_attempts",
                columns: new[] { "ExamId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_exam_attempts_ExamVersionId",
                schema: "examforge",
                table: "exam_attempts",
                column: "ExamVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_exam_attempts_UserId_StartedAtUtc",
                schema: "examforge",
                table: "exam_attempts",
                columns: new[] { "UserId", "StartedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_exam_sections_ExamVersionId_DisplayOrder",
                schema: "examforge",
                table: "exam_sections",
                columns: new[] { "ExamVersionId", "DisplayOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_exam_sections_ExamVersionId_Kind_DisplayOrder",
                schema: "examforge",
                table: "exam_sections",
                columns: new[] { "ExamVersionId", "Kind", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_exam_tag_mappings_ExamTagId_ExamId",
                schema: "examforge",
                table: "exam_tag_mappings",
                columns: new[] { "ExamTagId", "ExamId" });

            migrationBuilder.CreateIndex(
                name: "IX_exam_versions_ExamId_Status",
                schema: "examforge",
                table: "exam_versions",
                columns: new[] { "ExamId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_exam_versions_ExamId_VersionNumber",
                schema: "examforge",
                table: "exam_versions",
                columns: new[] { "ExamId", "VersionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_exam_versions_Status_PublishedAtUtc",
                schema: "examforge",
                table: "exam_versions",
                columns: new[] { "Status", "PublishedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "ux_exam_versions_one_published_per_exam",
                schema: "examforge",
                table: "exam_versions",
                column: "ExamId",
                unique: true,
                filter: "\"Status\" = 'Published'");

            migrationBuilder.CreateIndex(
                name: "IX_exams_IsArchived_CreatedAtUtc_Id",
                schema: "examforge",
                table: "exams",
                columns: new[] { "IsArchived", "CreatedAtUtc", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_exams_Slug",
                schema: "examforge",
                table: "exams",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_exams_Type_IsArchived",
                schema: "examforge",
                table: "exams",
                columns: new[] { "Type", "IsArchived" });

            migrationBuilder.CreateIndex(
                name: "IX_fill_answer_keys_QuestionId_BlankKey_DisplayOrder",
                schema: "examforge",
                table: "fill_answer_keys",
                columns: new[] { "QuestionId", "BlankKey", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_fill_answer_keys_QuestionId_BlankKey_NormalizedAnswer",
                schema: "examforge",
                table: "fill_answer_keys",
                columns: new[] { "QuestionId", "BlankKey", "NormalizedAnswer" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_question_options_QuestionId_DisplayOrder",
                schema: "examforge",
                table: "question_options",
                columns: new[] { "QuestionId", "DisplayOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_question_options_QuestionId_IsCorrect",
                schema: "examforge",
                table: "question_options",
                columns: new[] { "QuestionId", "IsCorrect" });

            migrationBuilder.CreateIndex(
                name: "IX_questions_ExamSectionId_ParentQuestionId_DisplayOrder",
                schema: "examforge",
                table: "questions",
                columns: new[] { "ExamSectionId", "ParentQuestionId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_questions_ExamSectionId_Type",
                schema: "examforge",
                table: "questions",
                columns: new[] { "ExamSectionId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_questions_ParentQuestionId",
                schema: "examforge",
                table: "questions",
                column: "ParentQuestionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "exam_attempt_selected_options",
                schema: "examforge");

            migrationBuilder.DropTable(
                name: "exam_tag_mappings",
                schema: "examforge");

            migrationBuilder.DropTable(
                name: "fill_answer_keys",
                schema: "examforge");

            migrationBuilder.DropTable(
                name: "exam_attempt_answers",
                schema: "examforge");

            migrationBuilder.DropTable(
                name: "question_options",
                schema: "examforge");

            migrationBuilder.DropTable(
                name: "exam_attempts",
                schema: "examforge");

            migrationBuilder.DropTable(
                name: "questions",
                schema: "examforge");

            migrationBuilder.DropTable(
                name: "exam_sections",
                schema: "examforge");

            migrationBuilder.DropTable(
                name: "exam_versions",
                schema: "examforge");

            migrationBuilder.DropTable(
                name: "exams",
                schema: "examforge");
        }
    }
}