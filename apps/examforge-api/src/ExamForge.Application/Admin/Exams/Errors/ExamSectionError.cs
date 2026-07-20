namespace ExamForge.Application.Admin.Exams.Errors;

public enum ExamSectionError
{
    None = 0,
    InvalidRequest = 1,
    ExamNotFound = 2,
    VersionNotFound = 3,
    SectionNotFound = 4,
    ExamArchived = 5,
    VersionNotEditable = 6,
    InvalidKind = 7,
    InvalidTitle = 8,
    InvalidInstructions = 9,
    InvalidStimulusText = 10,
    InvalidMediaUrl = 11,
    InvalidSectionOrder = 13,
    DisplayOrderExhausted = 14,
    ConcurrencyConflict = 15,
    InvalidNestedContent = 16,
    InvalidPatch = 17
}