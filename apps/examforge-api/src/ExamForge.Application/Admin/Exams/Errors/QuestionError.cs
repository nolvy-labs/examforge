namespace ExamForge.Application.Admin.Exams.Errors;

public enum QuestionError
{
    None = 0,
    InvalidRequest = 1,
    ExamNotFound = 2,
    VersionNotFound = 3,
    SectionNotFound = 4,
    QuestionNotFound = 5,
    ParentQuestionNotFound = 6,
    InvalidParentQuestion = 7,
    ExamArchived = 8,
    VersionNotEditable = 9,
    InvalidType = 10,
    InvalidPrompt = 11,
    InvalidExplanation = 12,
    InvalidPoints = 13,
    IncompatibleQuestionContent = 15,
    InvalidQuestionOrder = 16,
    DisplayOrderExhausted = 17,
    ConcurrencyConflict = 18,
    InvalidNestedContent = 19,
    InvalidPatch = 20
}