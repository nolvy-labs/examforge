using ExamForge.Domain.Exams;

namespace ExamForge.Application.Tests;

public sealed class ExamSectionDomainTests
{
    [Fact]
    public void Constructor_normalizes_values_and_initializes_empty_questions()
    {
        var section = new ExamSection(
            Guid.NewGuid(),
            ExamSectionKind.Reading,
            "  Reading   comprehension ",
            "  Read carefully.  ",
            "  Passage  ",
            "  https://example.com/media.mp3  ",
            3);

        Assert.Equal("Reading comprehension", section.Title);
        Assert.Equal("Read carefully.", section.Instructions);
        Assert.Equal("Passage", section.StimulusText);
        Assert.Equal("https://example.com/media.mp3", section.MediaUrl);
        Assert.Equal(3, section.DisplayOrder);
        Assert.Empty(section.Questions);
    }

    [Fact]
    public void Null_optional_values_are_stored_consistently()
    {
        var section = CreateSection(instructions: null, stimulusText: null, mediaUrl: null);

        Assert.Equal(string.Empty, section.Instructions);
        Assert.Null(section.StimulusText);
        Assert.Null(section.MediaUrl);
    }

    [Fact]
    public void No_op_update_does_not_touch_timestamp()
    {
        var section = CreateSection();

        var changed = section.UpdateDetails(
            section.Kind,
            section.Title,
            section.Instructions,
            section.StimulusText,
            section.MediaUrl);

        Assert.False(changed);
        Assert.Null(section.UpdatedAtUtc);
    }

    [Fact]
    public void Real_update_normalizes_values_and_touches_timestamp()
    {
        var section = CreateSection();

        var changed = section.UpdateDetails(
            ExamSectionKind.Listening,
            "  New   title ",
            "  New instructions ",
            " New stimulus ",
            " https://example.com/new.mp3 ");

        Assert.True(changed);
        Assert.Equal("New title", section.Title);
        Assert.Equal("New instructions", section.Instructions);
        Assert.Equal("New stimulus", section.StimulusText);
        Assert.Equal("https://example.com/new.mp3", section.MediaUrl);
        Assert.NotNull(section.UpdatedAtUtc);
    }

    [Fact]
    public void Display_order_change_is_idempotent()
    {
        var section = CreateSection(displayOrder: 2);

        Assert.False(section.ChangeDisplayOrder(2));
        Assert.Null(section.UpdatedAtUtc);
        Assert.True(section.ChangeDisplayOrder(0));
        Assert.Equal(0, section.DisplayOrder);
        Assert.NotNull(section.UpdatedAtUtc);
    }

    private static ExamSection CreateSection(
        string? instructions = "Instructions",
        string? stimulusText = "Stimulus",
        string? mediaUrl = "https://example.com/media",
        int displayOrder = 0) =>
        new(
            Guid.NewGuid(),
            ExamSectionKind.Default,
            "Section",
            instructions,
            stimulusText,
            mediaUrl,
            displayOrder);
}