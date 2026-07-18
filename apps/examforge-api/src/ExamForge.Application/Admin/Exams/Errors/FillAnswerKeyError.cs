namespace ExamForge.Application.Admin.Exams.Errors;

public enum FillAnswerKeyError
{
    None = 0,
    InvalidRequest = 1,
    ExamNotFound = 2,
    VersionNotFound = 3,
    SectionNotFound = 4,
    QuestionNotFound = 5,
    AnswerKeyNotFound = 6,
    ExamArchived = 7,
    VersionNotEditable = 8,
    QuestionDoesNotSupportAnswerKeys = 9,
    InvalidAcceptedAnswer = 10,
    DuplicateAcceptedAnswer = 11,
    ConcurrencyConflict = 12
}
