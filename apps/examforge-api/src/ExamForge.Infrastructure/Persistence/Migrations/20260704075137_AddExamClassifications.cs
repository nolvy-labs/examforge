using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamForge.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExamClassifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "exam_categories",
                schema: "examforge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Slug = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    MatchMode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    IsFeatured = table.Column<bool>(type: "boolean", nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exam_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "exam_tags",
                schema: "examforge",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Slug = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exam_tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "exam_category_tags",
                schema: "examforge",
                columns: table => new
                {
                    ExamCategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExamTagId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exam_category_tags", x => new { x.ExamCategoryId, x.ExamTagId });
                    table.ForeignKey(
                        name: "FK_exam_category_tags_exam_categories_ExamCategoryId",
                        column: x => x.ExamCategoryId,
                        principalSchema: "examforge",
                        principalTable: "exam_categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_exam_category_tags_exam_tags_ExamTagId",
                        column: x => x.ExamTagId,
                        principalSchema: "examforge",
                        principalTable: "exam_tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                schema: "examforge",
                table: "exam_tags",
                columns: new[] { "Id", "CreatedAtUtc", "Description", "IsArchived", "Name", "Slug", "Type", "UpdatedAtUtc" },
                values: new object[] { new Guid("a2c9706e-d53d-4361-81f7-681bba2aea53"), new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Tag use for testing", true, "Test tag", "test", "ExamType", null });

            migrationBuilder.CreateIndex(
                name: "IX_exam_categories_IsArchived_DisplayOrder",
                schema: "examforge",
                table: "exam_categories",
                columns: new[] { "IsArchived", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_exam_categories_IsArchived_IsFeatured_DisplayOrder",
                schema: "examforge",
                table: "exam_categories",
                columns: new[] { "IsArchived", "IsFeatured", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_exam_categories_Slug",
                schema: "examforge",
                table: "exam_categories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_exam_category_tags_ExamTagId_ExamCategoryId",
                schema: "examforge",
                table: "exam_category_tags",
                columns: new[] { "ExamTagId", "ExamCategoryId" });

            migrationBuilder.CreateIndex(
                name: "IX_exam_tags_IsArchived",
                schema: "examforge",
                table: "exam_tags",
                column: "IsArchived");

            migrationBuilder.CreateIndex(
                name: "IX_exam_tags_Type",
                schema: "examforge",
                table: "exam_tags",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_exam_tags_Type_Slug",
                schema: "examforge",
                table: "exam_tags",
                columns: new[] { "Type", "Slug" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "exam_category_tags",
                schema: "examforge");

            migrationBuilder.DropTable(
                name: "exam_categories",
                schema: "examforge");

            migrationBuilder.DropTable(
                name: "exam_tags",
                schema: "examforge");
        }
    }
}
