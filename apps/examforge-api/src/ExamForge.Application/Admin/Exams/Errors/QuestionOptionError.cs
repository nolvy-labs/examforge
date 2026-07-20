namespace ExamForge.Application.Admin.Exams.Errors;

public enum QuestionOptionError
{
    None = 0,
    InvalidRequest = 1,
    ExamNotFound = 2,
    VersionNotFound = 3,
    SectionNotFound = 4,
    QuestionNotFound = 5,
    OptionNotFound = 6,
    ExamArchived = 7,
    VersionNotEditable = 8,
    QuestionDoesNotSupportOptions = 9,
    InvalidText = 10,
    InvalidLabel = 11,
    InvalidExplanation = 12,
    InvalidOptionOrder = 14,
    DisplayOrderExhausted = 15,
    ConcurrencyConflict = 16,
    InvalidPatch = 17
}